import type * as coda from "@codahq/packs-sdk";
import type * as types from "./types";

const BASE_URL = "https://api.copper.com/developer_api/v1/";
const PAGE_SIZE = 50; // max accepted by the API is 200, but that can crash Pack execution

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

/**
 * Generic wrapper for the Copper API that takes care of common things like auth.
 * Common payload parameters:
 * page_size: default 20, max 200, typically just pass PAGE_SIZE constant
 * page_number: default 1, starts at 1
 * sort_by: the field to sort by
 * sort_order: asc (default) or desc
 */
async function callApi(
  context: coda.ExecutionContext,
  endpoint: string,
  method: "GET" | "POST" = "POST",
  payload?: { [key: string]: any },
  cacheTtlSecs: number = 60
) {
  // Set up custom auth tokens. This is a security measure of the Coda Pack SDK,
  // and relates to what we set up in pack.setUserAuthentication in pack.ts. Deails:
  // https://coda.github.io/packs-sdk/reference/sdk/interfaces/CustomAuthentication/
  const apiKeyToken = "{{apiKey-" + context.invocationToken + "}}";
  const emailToken = "{{email-" + context.invocationToken + "}}";
  const response = await context.fetcher.fetch({
    method: method,
    url: BASE_URL + endpoint,
    headers: {
      "X-PW-Application": "developer_api",
      "Content-Type": "application/json",
      "X-PW-UserEmail": emailToken,
      "X-PW-AccessToken": apiKeyToken,
    },
    body: JSON.stringify(payload),
    cacheTtlSecs: cacheTtlSecs,
  });
  return response;
}

/**
 * Contatenates the components of a Copper physical address into a single string
 * @param address object with street, city, state, country, postal_code like what Copper returns
 */
function concatenateAddress(address: types.CopperAddress) {
  let concatenatedAddress: string = "";
  if (address?.street) concatenatedAddress += address.street + ", ";
  if (address?.city) concatenatedAddress += address.city + ", ";
  if (address?.state) concatenatedAddress += address.state + ", ";
  if (address?.country) concatenatedAddress += address.country + ", ";
  if (address?.postal_code) concatenatedAddress += address.postal_code + ", ";
  return concatenatedAddress.slice(0, -2);
}

/**
 * Gets users in the Copper organization, for mapping to assignees/owners of records
 * @returns array of Copper users (objects with id, name, email)
 */
async function getCopperUsers(context: coda.ExecutionContext) {
  let response = await callApi(
    context,
    "users/search",
    "POST",
    { page_size: 200 }, // set arbitrarily high to get all users (Copper API max = 200)
    60 * 5 // cache for 5 minutes
  );
  return response.body;
}

/**
 * Generates human-ready URLs for Copper entities
 * @param copperAccountId pulled once and then provided each time (TODO: consider refactoring to fetch (cached) with each execution)
 * @param entityType using Copper's URL naming (company = "organization", opportunity = "deal", person = "contact")
 * @param entityId
 * @returns URL of the entity
 */
function getCopperUrl(
  copperAccountId: string,
  entityType: "organization" | "deal" | "contact",
  entityId: string
) {
  return `https://app.copper.com/companies/${copperAccountId}/app#/${entityType}/${entityId}`;
}

/**
 * Gets basic, long-lived account configuration info such as pipelines, customer sources,
 * loss reasons, etc.
 * @returns usually an array of objects, sometimes just an object (e.g. account)
 */
async function callApiBasicCached(
  context: coda.ExecutionContext,
  endpoint:
    | "pipelines"
    | "customer_sources"
    | "loss_reasons"
    | "account"
    | "contact_types"
) {
  const response = await callApi(
    context,
    endpoint,
    "GET",
    { page_size: PAGE_SIZE },
    60 * 60 // cache for 1 hour
  );
  return response.body;
}

/* -------------------------------------------------------------------------- */
/*                            Sync Table Functions                            */
/* -------------------------------------------------------------------------- */

/**
 * Syncs opportunities from Copper
 */
export async function syncOpportunities(context: coda.SyncExecutionContext) {
  // Get a list of Copper users, so we can map their email addresses to their
  // ids when they appear as assignees of an opportunity.
  let users = await getCopperUsers(context);
  // Get the Copper account ID for use when building Copper URLs later on
  // Note this is the id of the overall Copper organization, not just this user
  const copperAccount = await callApiBasicCached(context, "account");
  // Get additional Copper configuration info
  const pipelines = await callApiBasicCached(context, "pipelines");
  const customerSources = await callApiBasicCached(context, "customer_sources");
  const lossReasons = await callApiBasicCached(context, "loss_reasons");

  // If there is a previous continuation, grab its page number. Otherwise,
  // start at page 1.
  let pageNumber: number =
    (context.sync.continuation?.pageNumber as number) || 1;

  // Fetch a page of results
  let response = await callApi(context, "opportunities/search", "POST", {
    page_size: PAGE_SIZE,
    page_number: pageNumber,
    sort_by: "date_created",
    sort_direction: "desc",
  });

  // Process the results
  let opportunities = [];
  for (let opportunity of response.body) {
    // prepare reference to companies table
    if (opportunity.company_id) {
      opportunity.company = {
        companyId: opportunity.company_id,
        companyName: opportunity.company_name,
      };
    }
    // Prepare reference to Coda Person object (Coda will try to match this
    // to a Coda user based on email). First, find the matching user.
    let assignee = users.find((user) => user.id == opportunity.assignee_id);
    opportunity.assignee = {
      copperUserId: opportunity.assignee_id,
      email: assignee?.email,
      name: assignee?.name,
    };
    // Match primary contact (Person record)
    opportunity.primaryContact = {
      personId: opportunity.primary_contact_id,
      // TODO: pull person's name from API? that's a lot of calls...
    };
    // generate URL for Copper entity
    opportunity.url = getCopperUrl(copperAccount.id, "deal", opportunity.id);
    // Match to pipelines and pipeline stages
    let pipeline = pipelines.find(
      (pipeline) => pipeline.id == opportunity.pipeline_id
    );
    opportunity.pipeline = pipeline?.name;
    opportunity.pipelineStage = pipeline.stages.find(
      (stage) => stage.id == opportunity.pipeline_stage_id
    )?.name;
    // Match to customer sources
    opportunity.customerSource = customerSources.find(
      (source) => source.id == opportunity.customer_source_id
    )?.name;
    // Match to loss reasons
    opportunity.lossReason = lossReasons.find(
      (reason) => reason.id == opportunity.loss_reason_id
    )?.name;

    opportunities.push(opportunity);
  }

  // If we got a full page of results, that means there are probably more results
  // on the next page. Set up a continuation to grab the next page if so.
  let nextContinuation = {};
  if ((opportunities.length = PAGE_SIZE))
    nextContinuation = { pageNumber: pageNumber + 1 };

  return {
    result: opportunities,
    continuation: nextContinuation,
  };
}

/**
 * Syncs companies from Copper
 */
export async function syncCompanies(context: coda.SyncExecutionContext) {
  // Get the Copper account ID for use when building Copper URLs later on
  const copperAccount = await callApiBasicCached(context, "account");

  // If there is a previous continuation, grab its page number. Otherwise,
  // start at page 1.
  let pageNumber: number =
    (context.sync.continuation?.pageNumber as number) || 1;

  // Grab a page of results
  let response = await callApi(context, "companies/search", "POST", {
    page_size: PAGE_SIZE,
    page_number: pageNumber,
    sort_by: "name",
  });
  let companies = response.body;

  // generate address and Copper record URL
  companies.forEach((company) => {
    company.fullAddress = concatenateAddress(company.address);
    company.url = getCopperUrl(copperAccount.id, "organization", company.id);
  });

  // If we got a full page of results, that means there are probably more results
  // on the next page. Set up a continuation to grab the next page if so.
  let nextContinuation = undefined;
  if ((companies.length = PAGE_SIZE))
    nextContinuation = { pageNumber: pageNumber + 1 };

  return {
    result: companies,
    continuation: nextContinuation,
  };
}

/**
 * Syncs Person records (contacts) from Copper
 */
export async function syncPeople(context: coda.SyncExecutionContext) {
  // Get a list of Copper users, so we can map their email addresses to their
  // ids when they appear as assignees of a person record.
  let users = await getCopperUsers(context);
  // Get the Copper account ID for use when building Copper URLs later on
  // Note this is the id of the overall Copper organization, not just this user
  const copperAccount = await callApiBasicCached(context, "account");
  // Get additional Copper configuration info
  const contactTypes = await callApiBasicCached(context, "contact_types");

  // If there is a previous continuation, grab its page number. Otherwise,
  // start at page 1.
  let pageNumber: number =
    (context.sync.continuation?.pageNumber as number) || 1;

  // Grab a page of results
  let response = await callApi(context, "people/search", "POST", {
    page_size: PAGE_SIZE,
    page_number: pageNumber,
    sort_by: "name",
  });

  // Process the results
  let people = [];
  for (let person of response.body) {
    person.fullAddress = concatenateAddress(person.address);
    person.url = getCopperUrl(copperAccount.id, "contact", person.id);
    // prepare reference to companies table
    if (person.company_id) {
      person.company = {
        companyId: person.company_id,
        companyName: person.company_name,
      };
    }
    // Prepare reference to Coda Person object (Coda will try to match this
    // to a Coda user based on email). First, find the matching user.
    // TODO: refactor this out into a function
    let assignee = users.find((user) => user.id == person.assignee_id);
    person.assignee = {
      copperUserId: person.assignee_id,
      email: assignee?.email,
      name: assignee?.name,
    };
    // Match contact type and get string representation
    person.contactType = contactTypes.find(
      (contactType) => contactType.id == person.contact_type_id
    )?.name;

    people.push(person);
  }

  // If we got a full page of results, that means there are probably more results
  // on the next page. Set up a continuation to grab the next page if so.
  let nextContinuation = undefined;
  if ((people.length = PAGE_SIZE))
    nextContinuation = { pageNumber: pageNumber + 1 };

  return {
    result: people,
    continuation: nextContinuation,
  };
}
