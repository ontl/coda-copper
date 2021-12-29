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
 * Gets the Copper account ID for use in constructing user-facing URLs. Note that
 * this is the id of the users's organization, not just the specific user's account.
 */
async function getAccountId(context: coda.ExecutionContext) {
  const response = await callApi(context, "account", "GET", {}, 60 * 60 * 24);
  return response.body.id;
}

/**
 * Generates human-ready URLs for Copper entities
 * @param copperAccountId pulled once via getAccountId()
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

/* -------------------------------------------------------------------------- */
/*                            Sync Table Functions                            */
/* -------------------------------------------------------------------------- */

/**
 * Syncs opportunities from Copper
 */
export async function syncOpportunities(context: coda.SyncExecutionContext) {
  // Get a list of Copper users, so we can map their email addresses to their
  // ids when they appear as assignees of an opportunity.
  let usersResponse = await callApi(
    context,
    "users/search",
    "POST",
    {
      page_size: 200, // set arbitrarily high to get all users (Copper API max = 200)
    },
    60 * 5 // cache for 5 minutes
  );
  let users = usersResponse.body;

  // Get the Copper account ID for use when building Copper URLs later on
  const copperAccountId = await getAccountId(context);

  // If there is a previous continuation, grab its page number. Otherwise,
  // start at page 1.
  let pageNumber: number =
    (context.sync.continuation?.pageNumber as number) || 1;

  // Grab a page of results
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
    let assignee = users.filter((user) => user.id == opportunity.assignee_id);
    opportunity.assignee = {
      copperUserId: opportunity.assignee_id,
      email: assignee.email,
      name: assignee.name,
    };
    // generate URL for Copper entity
    opportunity.url = getCopperUrl(copperAccountId, "deal", opportunity.id);

    opportunities.push(opportunity);
  }

  // If we got a full page of results, that means there are probably more results
  // on the next page. Set up a continuation to grab the next page if so.
  let nextContinuation = undefined;
  if ((opportunities.length = PAGE_SIZE))
    nextContinuation.pageNumber = pageNumber + 1;

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
  const copperAccountId = await getAccountId(context);

  // If there is a previous continuation, grab its page number. Otherwise,
  // start at page 1.
  let pageNumber: number =
    (context.sync.continuation?.pageNumber as number) || 1;

  // Grab a page of results
  let response = await callApi(
    context,
    "companies/search",
    "POST",
    {
      page_size: PAGE_SIZE,
      page_number: pageNumber,
      sort_by: "name",
    },
    60
  );
  let companies = response.body;

  // generate concatenated string representation of company address
  companies.forEach((company) => {
    company.fullAddress = concatenateAddress(company.address);
    company.url = getCopperUrl(copperAccountId, "organization", company.id);
  });

  // If we got a full page of results, that means there are probably more results
  // on the next page. Set up a continuation to grab the next page if so.
  let nextContinuation = undefined;
  if ((companies.length = PAGE_SIZE))
    nextContinuation = {
      pageNumber: pageNumber + 1,
    };

  return {
    result: companies,
    continuation: nextContinuation,
  };
}
