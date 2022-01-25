import * as coda from "@codahq/packs-sdk";
import * as constants from "./constants";
import type * as types from "./types";

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
export async function callApi(
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
    url: constants.BASE_URL + endpoint,
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
export async function callApiBasicCached(
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
    { page_size: constants.PAGE_SIZE },
    60 * 60 // cache for 1 hour
  );
  return response.body;
}

/**
 * Gets users in the Copper organization, for mapping to assignees/owners of records
 * @returns array of Copper users (objects with id, name, email)
 */
export async function getCopperUsers(context: coda.ExecutionContext) {
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
export function getIdFromUrlOrId(idOrUrl: string) {
  const copperIdRegex = new RegExp("^[0-9]{5,}$"); // just a number, with 5 or more digits
  // If it already looks like an ID, just return it
  if (copperIdRegex.test(idOrUrl)) return { id: idOrUrl, type: null };
  // If it looks like a URL, extract the ID from the URL (the id is going to be caught in
  // the 2nd capture group, accessible via [2])
  if (constants.copperRecordUrlRegex.test(idOrUrl)) {
    let matches = constants.copperRecordUrlRegex.exec(idOrUrl);
    if (matches) {
      // The type is the second capture group, accessible via [1]. convert it from the
      // nomenclature used in Copper's URLs to the nomenclature used everywhere else (the 'primary')
      let recordType = constants.RECORD_TYPES.find(
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

export function checkRecordIdType(recordType: string, expectedType: string) {
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

export function titleCase(string: string) {
  return string[0].toUpperCase() + string.slice(1).toLowerCase();
}

export function humanReadableList(list: string[], conjunction: string = "or") {
  if (list.length === 1) return list[0];
  if (list.length === 2) return list.join(" " + conjunction + " ");
  return (
    list.slice(0, -1).join(", ") + ", " + conjunction + " " + list.slice(-1)
  );
}

/* -------------------------------------------------------------------------- */
/*                           API Response Formatters                          */
/* -------------------------------------------------------------------------- */

// NON-FETCH VERSIONS: Take in existing data that has already been returned from
// the API (for the main record and also its supporting data), and use the
// supporting data to enrich the main record.

export function enrichPersonResponse(
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
      id: person.company_id,
      name: person.company_name,
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

export function enrichCompanyResponse(
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

export function enrichOpportunityResponse(
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
        id: opportunity.company_id,
        name: opportunity.company_name,
      };
    }
    if (opportunity.primary_contact_id) {
      opportunity.primaryContact = {
        id: opportunity.primary_contact_id,
        // we could pull the name from the API but that would be vv expensive. Instead,
        // let's set a default that will be overridden by a successful reference to
        fullName: "Not found",
      };
    }
  }
  return opportunity;
}

// FETCH VERSIONS: Enrich from just a record API response, by fetching the supporting data

// Why not use these fetch methods all the time? Because in the case of sync
// tables, we just want to fetch this info once and re-use it across all records,
// without hitting the endpoints again each time. Coda's built-in caching would
// usually help with this problem, but since some of the endpoints we need to hit
// are POST (e.g. getCopperUsers()), we can't rely on the built-in caching.

export async function enrichPersonResponseWithFetches(
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

export async function enrichCompanyResponseWithFetches(
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

export async function enrichOpportunityResponseWithFetches(
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
