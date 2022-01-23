import * as coda from "@codahq/packs-sdk";
import type * as types from "./types";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const BASE_URL = "https://api.copper.com/developer_api/v1/";
const PAGE_SIZE = 50; // max accepted by the API is 200, but that can crash Pack execution
const STATUS_OPTIONS = ["Open", "Won", "Lost", "Abandoned"];
const RECORD_TYPES = [
  // Copper refers to these record types differently in different contexts. For example,
  // a customer is called a "person" in the UI and in API urls (the plural "people" is
  // used in API urls too). In web URLs though, the legacy term "contact" is used.
  {
    primary: "person",
    plural: "people",
    webUrl: "contact",
  },
  {
    primary: "company",
    plural: "companies",
    webUrl: "organization",
  },
  {
    primary: "opportunity",
    plural: "opportunities",
    webUrl: "deal",
  },
];
export const copperRecordUrlRegex = new RegExp(
  "/app.copper.com/companies/[0-9]+/app#/.*(contact|deal|organization)/([0-9]{5,})"
);
export const copperOpportunityUrlRegex = new RegExp(
  "^https://app.copper.com/companies/[0-9]+/app#/.*deal/([0-9]{5,})"
);
export const copperPersonUrlRegex = new RegExp(
  "^https://app.copper.com/companies/[0-9]+/app#/.*contact/([0-9]{5,})"
);
export const copperCompanyUrlRegex = new RegExp(
  "^https://app.copper.com/companies/[0-9]+/app#/.*organization/([0-9]{5,})"
);

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
  method: "GET" | "POST" | "PUT" = "POST",
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
  let copperUsers: types.CopperUserApiResponse[] = response.body;
  return copperUsers;
}

/**
 * Contatenates the components of a Copper physical address into a single string
 * @param address object with street, city, state, country, postal_code like what Copper returns
 */
function concatenateAddress(address: types.AddressApiProperty) {
  let concatenatedAddress: string = "";
  if (address?.street) concatenatedAddress += address.street + ", ";
  if (address?.city) concatenatedAddress += address.city + ", ";
  if (address?.state) concatenatedAddress += address.state + ", ";
  if (address?.country) concatenatedAddress += address.country + ", ";
  if (address?.postal_code) concatenatedAddress += address.postal_code + ", ";
  return concatenatedAddress.slice(0, -2);
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
 * Extracts a Copper record ID from a Copper URL (or just returns the ID if ID is supplied)
 * @param idOrUrl user-supplied record ID or Copper URL for a record
 * @returns { id, type }
 */
function getIdFromUrlOrId(idOrUrl: string) {
  const copperIdRegex = new RegExp("^[0-9]{5,}$"); // just a number, with 5 or more digits
  // If it already looks like an ID, just return it
  if (copperIdRegex.test(idOrUrl)) return { id: idOrUrl, type: null };
  // If it looks like a URL, extract the ID from the URL (the id is going to be caught in
  // the 2nd capture group, accessible via [2])
  if (copperRecordUrlRegex.test(idOrUrl)) {
    let matches = copperRecordUrlRegex.exec(idOrUrl);
    if (matches) {
      // The type is the second capture group, accessible via [1]. convert it from the
      // nomenclature used in Copper's URLs to the nomenclature used everywhere else (the 'primary')
      let recordType = RECORD_TYPES.find(
        (type) => type.webUrl === matches[1]
      ).primary;
      return {
        id: matches[2],
        type: recordType,
      };
    }
  }
  // It didn't look like a valid ID or a URL
  throw new coda.UserVisibleError("Invalid Copper ID or URL");
}

function checkRecordIdType(recordType: string, expectedType: string) {
  if (recordType && recordType !== expectedType) {
    throw new coda.UserVisibleError(
      `Expected ${addIndefiniteArticle(
        expectedType
      )}, but got ${addIndefiniteArticle(recordType)}`
    );
  }
}

function addIndefiniteArticle(word: string) {
  // Add "a" or "an" to the beginning of a word because UX
  let vowels = "aeiou";
  let article = vowels.includes(word[0]) ? "an" : "a";
  return article + " " + word;
}

function titleCase(string: string) {
  return string[0].toUpperCase() + string.slice(1).toLowerCase();
}

function humanReadableList(list: string[], conjunction: string = "or") {
  if (list.length === 1) return list[0];
  if (list.length === 2) return list.join(" " + conjunction + " ");
  return (
    list.slice(0, -1).join(", ") + ", " + conjunction + " " + list.slice(-1)
  );
}

/* -------------------------------------------------------------------------- */
/*                           API Response Formatters                          */
/* -------------------------------------------------------------------------- */

// NON-FETCH VERSIONS: Enrich from existing data for both records and supporting data

function enrichPersonResponse(
  person: any,
  copperAccountId: string,
  users: types.CopperUserApiResponse[],
  contactTypes: types.BasicApiResponse[]
) {
  person.fullAddress = concatenateAddress(person.address);
  person.url = getCopperUrl(copperAccountId, "contact", person.id);
  // prepare reference to companies table
  if (person.company_id) {
    person.company = {
      companyId: person.company_id,
      companyName: person.company_name,
    };
  }
  if (users) {
    // Prepare reference to Coda Person object (Coda will try to match this
    // to a Coda user based on email). First, find the matching user.
    let assignee = users.find((user) => user.id == person.assignee_id);
    person.assignee = {
      copperUserId: person.assignee_id,
      email: assignee?.email,
      name: assignee?.name,
    };
  }
  if (contactTypes) {
    // Match contact type and get string representation
    person.contactType = contactTypes.find(
      (contactType) => contactType.id == person.contact_type_id
    )?.name;
  }
  return person;
}

function enrichCompanyResponse(
  company: any,
  copperAccountId: string,
  users: types.CopperUserApiResponse[]
) {
  company.url = getCopperUrl(copperAccountId, "organization", company.id);
  company.fullAddress = concatenateAddress(company.address);
  if (users) {
    // Prepare reference to Coda Person object (Coda will try to match this
    // to a Coda user based on email). First, find the matching user.
    let assignee = users.find((user) => user.id == company.assignee_id);
    company.assignee = {
      copperUserId: company.assignee_id,
      email: assignee?.email,
      name: assignee?.name,
    };
  }
  return company;
}

function enrichOpportunityResponse(
  opportunity: any,
  copperAccountId: string,
  users: types.CopperUserApiResponse[],
  pipelines: types.PipelineApiResponse[],
  customerSources: types.BasicApiResponse[],
  lossReasons: types.BasicApiResponse[],
  // references to other tables only work in sync tables; don't add them for column formats
  withReferences: boolean = false
) {
  opportunity.url = getCopperUrl(copperAccountId, "deal", opportunity.id);
  // Prepare reference to Coda Person object (Coda will try to match this
  // to a Coda user based on email). First, find the matching user.
  let assignee = users.find((user) => user.id == opportunity.assignee_id);
  opportunity.assignee = {
    copperUserId: opportunity.assignee_id,
    email: assignee?.email,
    name: assignee?.name,
  };
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

  // If we're enriching this record for a sync table, we want to prepare references
  // to other tables like the related Comapny and Person (contact). This referencing
  // isn't supported for column formats, so that's why we don't always want to do it.
  if (withReferences) {
    if (opportunity.company_id) {
      opportunity.company = {
        companyId: opportunity.company_id,
        companyName: opportunity.company_name,
      };
    }
    if (opportunity.primary_contact_id) {
      opportunity.primaryContact = {
        personId: opportunity.primary_contact_id,
        // we could pull the name from the API but that would be vv expensive. Instead,
        // let's set a default that will be overridden by a successful reference to
        fullName: "Not found",
      };
    }
  }
  return opportunity;
}

// FETCH VERSIONS: Enrich from just a record, by fetching the supporting data

// Why not use these fetch methods all the time? Because in the case of sync
// tables, we just want to fetch this info once and re-use it across all records.

async function enrichPersonResponseWithFetches(
  context: coda.ExecutionContext,
  person: types.PersonApiResponse
) {
  // Fetch the enrichment data we'll need
  const [
    users, // Copper users who might be "assignees"
    copperAccount, // for building Copper URLs
    contactTypes,
  ] = await Promise.all([
    getCopperUsers(context),
    callApiBasicCached(context, "account"),
    callApiBasicCached(context, "contact_types"),
  ]);

  let enrichedPerson = await enrichPersonResponse(
    person,
    copperAccount.id,
    users,
    contactTypes
  );

  return enrichedPerson;
}

async function enrichCompanyResponseWithFetches(
  context: coda.ExecutionContext,
  company: types.CompanyApiResponse
) {
  // Fetch the enrichment data we'll need
  const [users, copperAccount] = await Promise.all([
    getCopperUsers(context),
    callApiBasicCached(context, "account"),
  ]);

  let enrichedCompany = await enrichCompanyResponse(
    company,
    copperAccount.id,
    users
  );

  return enrichedCompany;
}

async function enrichOpportunityResponseWithFetches(
  context: coda.ExecutionContext,
  opportunity: types.OpportunityApiResponse
) {
  // Fetch the enrichment data we'll need
  const [users, pipelines, customerSources, lossReasons, copperAccount] =
    await Promise.all([
      getCopperUsers(context),
      callApiBasicCached(context, "pipelines"),
      callApiBasicCached(context, "customer_sources"),
      callApiBasicCached(context, "loss_reasons"),
      callApiBasicCached(context, "account"),
    ]);

  let enrichedOpportunity = await enrichOpportunityResponse(
    opportunity,
    copperAccount.id,
    users,
    pipelines,
    customerSources,
    lossReasons
  );

  return enrichedOpportunity;
}

/* -------------------------------------------------------------------------- */
/*                            Sync Table Functions                            */
/* -------------------------------------------------------------------------- */

/**
 * Syncs opportunities from Copper
 */
export async function syncOpportunities(context: coda.SyncExecutionContext) {
  // If there is a previous continuation, grab its page number. Otherwise,
  // start at page 1.
  let pageNumber: number =
    (context.sync.continuation?.pageNumber as number) || 1;

  // Get a page of results, as well as all the background info we'll need to enrich
  // the records we get back from the Copper API
  const [
    response, // page of results from Copper API
    users, // Copper users who might be "assignees"
    copperAccount, // for building Copper URLs
    pipelines,
    customerSources,
    lossReasons,
  ] = await Promise.all([
    callApi(context, "opportunities/search", "POST", {
      page_size: PAGE_SIZE,
      page_number: pageNumber,
      sort_by: "date_created",
      sort_direction: "desc",
    }),
    getCopperUsers(context),
    callApiBasicCached(context, "account"),
    callApiBasicCached(context, "pipelines"),
    callApiBasicCached(context, "customer_sources"),
    callApiBasicCached(context, "loss_reasons"),
  ]);

  // Process the results
  let opportunities: types.OpportunityApiResponse[] = response.body.map(
    (opportunity: types.OpportunityApiResponse) =>
      enrichOpportunityResponse(
        opportunity,
        copperAccount.id,
        users,
        pipelines,
        customerSources,
        lossReasons,
        true // include references to Person and Company sync tables
      )
  );

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
  // If there is a previous continuation, grab its page number. Otherwise,
  // start at page 1.
  let pageNumber: number =
    (context.sync.continuation?.pageNumber as number) || 1;

  // Get a page of results, the Copper account info we'll need for building URLs,
  // and the list of users who might be "assignees"
  const [response, copperAccount, users] = await Promise.all([
    callApi(context, "companies/search", "POST", {
      page_size: PAGE_SIZE,
      page_number: pageNumber,
      sort_by: "name",
    }),
    callApiBasicCached(context, "account"),
    getCopperUsers(context),
  ]);

  // Process the results by passing each company to the enrichment function
  let companies: types.CompanyApiResponse[] = response.body.map(
    (company: types.CompanyApiResponse) =>
      enrichCompanyResponse(company, copperAccount.id, users)
  );

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
  // If there is a previous continuation, grab its page number. Otherwise,
  // start at page 1.
  let pageNumber: number =
    (context.sync.continuation?.pageNumber as number) || 1;

  // Get a page of results, as well as all the background info we'll need to enrich
  // the records we get back from the Copper API
  const [response, users, copperAccount, contactTypes] = await Promise.all([
    callApi(context, "people/search", "POST", {
      page_size: PAGE_SIZE,
      page_number: pageNumber,
      sort_by: "name",
    }),
    getCopperUsers(context),
    callApiBasicCached(context, "account"),
    callApiBasicCached(context, "contact_types"),
  ]);

  // Process the results by sending each person to the enrichment function
  let people: types.PersonApiResponse[] = response.body.map(
    (person: types.PersonApiResponse) =>
      enrichPersonResponse(person, copperAccount.id, users, contactTypes)
  );

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

/* -------------------------------------------------------------------------- */
/*                               Getter Formulas                              */
/* -------------------------------------------------------------------------- */

export async function getOpportunity(
  context: coda.ExecutionContext,
  urlOrId: string
) {
  // Determine whether the user supplied an ID or a full URL, and extract the ID
  const opportunityId = getIdFromUrlOrId(urlOrId as string);
  // If we know the record type, and it's the wrong type, throw an error.
  // We'll only know the type if the user supplied a URL though (not when they just
  // supplied an ID)
  checkRecordIdType(opportunityId.type, "opportunity");
  // Get the opportunity, as well as all the background info we'll need to enrich
  // the records we get back from the Copper API
  const [
    response, // opportunity record from Copper API
    users, // Copper users who might be "assignees"
    copperAccount, // for building Copper URLs
    pipelines,
    customerSources,
    lossReasons,
  ] = await Promise.all([
    callApi(context, "opportunities/" + opportunityId.id, "GET"),
    getCopperUsers(context),
    callApiBasicCached(context, "account"),
    callApiBasicCached(context, "pipelines"),
    callApiBasicCached(context, "customer_sources"),
    callApiBasicCached(context, "loss_reasons"),
  ]);

  let opportunity = await enrichOpportunityResponse(
    response.body,
    copperAccount.id,
    users,
    pipelines,
    customerSources,
    lossReasons,
    false // don't include references to Person and Company sync tables
  );

  return opportunity;
}

export async function getPerson(
  context: coda.ExecutionContext,
  urlOrId: string
) {
  // Determine whether the user supplied an ID or a full URL, and extract the ID
  const opportunityId = getIdFromUrlOrId(urlOrId as string);
  checkRecordIdType(opportunityId.type, "person");
  // Get the person, as well as all the background info we'll need to enrich
  // the records we get back from the Copper API
  const [
    response, // opportunity record from Copper API
    users, // Copper users who might be "assignees"
    copperAccount, // for building Copper URLs
    contactTypes,
  ] = await Promise.all([
    callApi(context, "people/" + opportunityId.id, "GET"),
    getCopperUsers(context),
    callApiBasicCached(context, "account"),
    callApiBasicCached(context, "contact_types"),
  ]);

  let person = await enrichPersonResponse(
    response.body,
    copperAccount.id,
    users,
    contactTypes
  );

  return person;
}

export async function getCompany(
  context: coda.ExecutionContext,
  urlOrId: string
) {
  // Determine whether the user supplied an ID or a full URL, and extract the ID
  const opportunityId = getIdFromUrlOrId(urlOrId as string);
  checkRecordIdType(opportunityId.type, "company");
  // Get the company, as well as all the background info we'll need to enrich
  // the records we get back from the Copper API
  const [
    response, // opportunity record from Copper API
    users, // Copper users who might be "assignees"
    copperAccount, // for building Copper URLs
  ] = await Promise.all([
    callApi(context, "companies/" + opportunityId.id, "GET"),
    getCopperUsers(context),
    callApiBasicCached(context, "account"),
  ]);

  let company = await enrichCompanyResponse(
    response.body,
    copperAccount.id,
    users
  );

  return company;
}

/* -------------------------------------------------------------------------- */
/*                               Action Formulas                              */
/* -------------------------------------------------------------------------- */

export async function updateOpportunityStatus(
  context: coda.ExecutionContext,
  urlOrId: string,
  newStatus: string, // the loss reason in plain text (not the loss reason ID)
  lossReason?: string // if changing the status to lost, accept a loss reason
) {
  // Determine whether the user supplied an ID or a full URL, and extract the ID
  const opportunityId = getIdFromUrlOrId(urlOrId);
  // Make sure it's the correct type of record
  checkRecordIdType(opportunityId.type, "opportunity");
  // Make sure the status is valid
  newStatus = titleCase(newStatus);
  if (!STATUS_OPTIONS.includes(newStatus)) {
    throw new coda.UserVisibleError(
      "New status must be " + humanReadableList(STATUS_OPTIONS)
    );
  }

  // Prepare the payload, including loss reason if appropriate
  let payload: any = {
    status: newStatus,
  };
  if (lossReason && newStatus === "Lost") {
    let lossReasons = await callApiBasicCached(context, "loss_reasons");
    // Is the new reason in our list of loss reasons?
    let lossReasonObject = lossReasons.find(
      (reason) => reason.name === lossReason
    );
    if (lossReasonObject) {
      payload.loss_reason_id = lossReasonObject.id as string;
    } else {
      // We didn't find a match for the provided loss reason; tell user what their options are
      throw new coda.UserVisibleError(
        "Loss reason must be " +
          humanReadableList(lossReasons.map(({ name }) => name))
      );
    }
  }

  console.log("payload", payload);
  // Update the status (the API will respond with the updated opportunity, so
  // we'll hang onto that too)
  let response = await callApi(
    context,
    "opportunities/" + opportunityId.id,
    "PUT",
    payload
  );

  let opportunity = await enrichOpportunityResponseWithFetches(
    context,
    response.body
  );

  return opportunity;
}

export async function assignRecord(
  context: coda.ExecutionContext,
  recordType: "opportunity" | "person" | "company",
  urlOrId: string,
  assigneeEmail: string
) {
  // Determine whether the user supplied an ID or a full URL, and extract the ID
  const recordId = getIdFromUrlOrId(urlOrId);
  // Make sure it's the correct type of record
  checkRecordIdType(recordId.type, recordType);
  // Make sure the assignee exists in the Copper system
  let users: types.CopperUserApiResponse[] = await getCopperUsers(context);
  let assigneeUser = users.find((user) => user.email === assigneeEmail);
  if (!assigneeUser) {
    throw new coda.UserVisibleError(
      `Couldn't find a Copper user with the email address "${assigneeEmail}". Try ${humanReadableList(
        users.map(({ email }) => email)
      )}.`
    );
  }
  // Prepare the payload
  let payload = {
    assignee_id: assigneeUser.id,
  };
  // Prepare the URL
  let url =
    RECORD_TYPES.find((type) => type.primary === recordType).plural +
    "/" +
    recordId.id;
  // Update the record (the API will respond with the updated record, so
  // we'll hang onto that too)
  let response = await callApi(context, url, "PUT", payload);

  let updatedRecord: any;
  switch (recordType) {
    case "opportunity":
      updatedRecord = await enrichOpportunityResponseWithFetches(
        context,
        response.body
      );
      break;
    case "person":
      updatedRecord = await enrichPersonResponseWithFetches(
        context,
        response.body
      );
      break;
    case "company":
      updatedRecord = await enrichCompanyResponseWithFetches(
        context,
        response.body
      );
      break;
  }

  return updatedRecord;
}
