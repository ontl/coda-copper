import * as coda from "@codahq/packs-sdk";
import * as constants from "./constants";
import * as types from "./types";
import * as helpers from "./helpers";

/* -------------------------------------------------------------------------- */
/*                               Getter Formulas                              */
/* -------------------------------------------------------------------------- */

export async function getOpportunity(
  context: coda.ExecutionContext,
  urlOrId: string
) {
  // Determine whether the user supplied an ID or a full URL, and extract the ID
  const opportunityId = helpers.getIdFromUrlOrId(urlOrId as string);
  // If we know the record type, and it's the wrong type, throw an error.
  // We'll only know the type if the user supplied a URL though (not when they just
  // supplied an ID)
  helpers.checkRecordIdType(opportunityId.type, "opportunity");
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
    helpers.callApi(context, "opportunities/" + opportunityId.id, "GET"),
    helpers.getCopperUsers(context),
    helpers.callApiBasicCached(context, "account"),
    helpers.callApiBasicCached(context, "pipelines"),
    helpers.callApiBasicCached(context, "customer_sources"),
    helpers.callApiBasicCached(context, "loss_reasons"),
  ]);

  let opportunity = await helpers.enrichOpportunityResponse(
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
  const opportunityId = helpers.getIdFromUrlOrId(urlOrId as string);
  helpers.checkRecordIdType(opportunityId.type, "person");
  // Get the person, as well as all the background info we'll need to enrich
  // the records we get back from the Copper API
  const [
    response, // opportunity record from Copper API
    users, // Copper users who might be "assignees"
    copperAccount, // for building Copper URLs
    contactTypes,
  ] = await Promise.all([
    helpers.callApi(context, "people/" + opportunityId.id, "GET"),
    helpers.getCopperUsers(context),
    helpers.callApiBasicCached(context, "account"),
    helpers.callApiBasicCached(context, "contact_types"),
  ]);

  let person = await helpers.enrichPersonResponse(
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
  const opportunityId = helpers.getIdFromUrlOrId(urlOrId as string);
  helpers.checkRecordIdType(opportunityId.type, "company");
  // Get the company, as well as all the background info we'll need to enrich
  // the records we get back from the Copper API
  const [
    response, // opportunity record from Copper API
    users, // Copper users who might be "assignees"
    copperAccount, // for building Copper URLs
  ] = await Promise.all([
    helpers.callApi(context, "companies/" + opportunityId.id, "GET"),
    helpers.getCopperUsers(context),
    helpers.callApiBasicCached(context, "account"),
  ]);

  let company = await helpers.enrichCompanyResponse(
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
  newStatus: string,
  lossReason?: string // if changing the status to lost, accept a loss reason
) {
  // Determine whether the user supplied an ID or a full URL, and extract the ID
  const opportunityId = helpers.getIdFromUrlOrId(urlOrId);
  // Make sure it's the correct type of record
  helpers.checkRecordIdType(opportunityId.type, "opportunity");
  // Make sure the status is valid
  newStatus = helpers.titleCase(newStatus);
  if (!constants.STATUS_OPTIONS.includes(newStatus)) {
    throw new coda.UserVisibleError(
      "New status must be " +
        helpers.humanReadableList(constants.STATUS_OPTIONS)
    );
  }

  // Prepare the payload, including loss reason if appropriate
  let payload: any = {
    status: newStatus,
  };
  if (lossReason && newStatus === "Lost") {
    let lossReasons = await helpers.callApiBasicCached(context, "loss_reasons");
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
          helpers.humanReadableList(lossReasons.map(({ name }) => name))
      );
    }
  }

  console.log("payload", payload);
  // Update the status (the API will respond with the updated opportunity, so
  // we'll hang onto that too)
  let response = await helpers.callApi(
    context,
    "opportunities/" + opportunityId.id,
    "PUT",
    payload
  );

  let opportunity = await helpers.enrichOpportunityResponseWithFetches(
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
  const recordId = helpers.getIdFromUrlOrId(urlOrId);
  // Make sure it's the correct type of record
  helpers.checkRecordIdType(recordId.type, recordType);
  // Make sure the assignee exists in the Copper system
  let users: types.CopperUserApiResponse[] = await helpers.getCopperUsers(
    context
  );
  let assigneeUser = users.find((user) => user.email === assigneeEmail);
  if (!assigneeUser) {
    throw new coda.UserVisibleError(
      `Couldn't find a Copper user with the email address "${assigneeEmail}". Try ${helpers.humanReadableList(
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
    constants.RECORD_TYPES.find((type) => type.primary === recordType).plural +
    "/" +
    recordId.id;
  // Update the record (the API will respond with the updated record, so
  // we'll hang onto that too)
  let response = await helpers.callApi(context, url, "PUT", payload);

  let updatedRecord: any;
  switch (recordType) {
    case "opportunity":
      updatedRecord = await helpers.enrichOpportunityResponseWithFetches(
        context,
        response.body
      );
      break;
    case "person":
      updatedRecord = await helpers.enrichPersonResponseWithFetches(
        context,
        response.body
      );
      break;
    case "company":
      updatedRecord = await helpers.enrichCompanyResponseWithFetches(
        context,
        response.body
      );
      break;
  }

  return updatedRecord;
}
/* -------------------------------------------------------------------------- */
/*                                Autocomplete                                */
/* -------------------------------------------------------------------------- */

export async function getLossReasons(context: coda.ExecutionContext) {
  let response = await helpers.callApiBasicCached(context, "loss_reasons");
  return response.map((reason) => reason.name);
}

export async function getUsers(context: coda.ExecutionContext) {
  let response = await helpers.getCopperUsers(context);
  return response.map((user) => user.email);
}
