import type * as coda from "@codahq/packs-sdk";
import type * as types from "./types";

/**
 * You can put the complicated business logic of your pack in this file,
 * or multiple files, to nicely separate your pack's logic from the
 * high-level definition in pack.ts
 */

const baseUrl = "https://api.copper.com/developer_api/v1/";
const pageSize = 25;

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

async function callApi(
  context: coda.ExecutionContext,
  endpoint: string,
  method: "GET" | "POST" = "POST",
  payload?: { [key: string]: any }
) {
  // Set up custom auth tokens. This is a security measure of the Coda Pack SDK,
  // and relates to what we set up in pack.setUserAuthentication in pack.ts. Deails:
  // https://coda.github.io/packs-sdk/reference/sdk/interfaces/CustomAuthentication/
  const apiKeyToken = "{{apiKey-" + context.invocationToken + "}}";
  const emailToken = "{{email-" + context.invocationToken + "}}";
  const response = await context.fetcher.fetch({
    method: method,
    url: baseUrl + endpoint,
    headers: {
      "X-PW-Application": "developer_api",
      "Content-Type": "application/json",
      "X-PW-UserEmail": emailToken,
      "X-PW-AccessToken": apiKeyToken,
    },
    body: JSON.stringify(payload),
  });
  return response;
}

function concatenateAddress(address: types.CopperAddress) {
  let concatenatedAddress: string = "";
  if (address.street) concatenatedAddress += address.street + ", ";
  if (address.city) concatenatedAddress += address.city + ", ";
  if (address.state) concatenatedAddress += address.state + ", ";
  if (address.country) concatenatedAddress += address.country + ", ";
  if (address.postal_code) concatenatedAddress += address.postal_code + ", ";
  return concatenatedAddress.slice(0, -2);
}

/* -------------------------------------------------------------------------- */
/*                            Sync Table Functions                            */
/* -------------------------------------------------------------------------- */

export async function syncOpportunities(context: coda.SyncExecutionContext) {
  let response = await callApi(context, "opportunities/search", "POST", {
    page_size: pageSize,
    sort_by: "date_created",
  });
  return {
    result: response.body,
    continuation: undefined,
  };
}

export async function syncCompanies(context: coda.SyncExecutionContext) {
  let response = await callApi(context, "companies/search", "POST", {
    page_size: pageSize,
    sort_by: "date_created",
  });
  let companies = response.body;
  // generate concatenated string representation of company address
  companies.forEach((company) => {
    company.fullAddress = concatenateAddress(company.address);
  });
  return {
    result: companies,
    continuation: undefined,
  };
}
