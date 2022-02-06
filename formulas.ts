import * as coda from "@codahq/packs-sdk";
import * as constants from "./constants";
import * as types from "./types";
import * as helpers from "./helpers";

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
    customFieldDefinitions,
  ] = await Promise.all([
    helpers.callApi(context, "opportunities/search", "POST", {
      page_size: constants.PAGE_SIZE,
      page_number: pageNumber,
      sort_by: "date_created",
      sort_direction: "desc",
      custom_field_computed_values: true,
    }),
    helpers.getCopperUsers(context),
    helpers.callApiBasicCached(context, "account"),
    helpers.callApiBasicCached(context, "pipelines"),
    helpers.callApiBasicCached(context, "customer_sources"),
    helpers.callApiBasicCached(context, "loss_reasons"),
    helpers.callApiBasicCached(context, "custom_field_definitions"),
  ]);

  // Process the results
  let opportunities: types.OpportunityApiResponse[] = response.body.map(
    (opportunity: types.OpportunityApiResponse) =>
      helpers.enrichOpportunityResponse(
        opportunity,
        copperAccount.id,
        users,
        pipelines,
        customerSources,
        lossReasons,
        customFieldDefinitions,
        true // include references to Person and Company sync tables
      )
  );

  // If we got a full page of results, that means there are probably more results
  // on the next page. Set up a continuation to grab the next page if so.
  let nextContinuation = {};
  if (opportunities.length == constants.PAGE_SIZE)
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
  const [response, copperAccount, users, customFieldDefinitions] =
    await Promise.all([
      helpers.callApi(context, "companies/search", "POST", {
        page_size: constants.PAGE_SIZE,
        page_number: pageNumber,
        sort_by: "name",
        custom_field_computed_values: true,
      }),
      helpers.callApiBasicCached(context, "account"),
      helpers.getCopperUsers(context),
      helpers.callApiBasicCached(context, "custom_field_definitions"),
    ]);

  // Process the results by passing each company to the enrichment function
  let companies: types.CompanyApiResponse[] = response.body.map(
    (company: types.CompanyApiResponse) =>
      helpers.enrichCompanyResponse(
        company,
        copperAccount.id,
        users,
        customFieldDefinitions
      )
  );

  // If we got a full page of results, that means there are probably more results
  // on the next page. Set up a continuation to grab the next page if so.
  let nextContinuation = undefined;
  if (companies.length == constants.PAGE_SIZE)
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
  const [response, users, copperAccount, contactTypes, customFieldDefinitions] =
    await Promise.all([
      helpers.callApi(context, "people/search", "POST", {
        page_size: constants.PAGE_SIZE,
        page_number: pageNumber,
        sort_by: "name",
        custom_field_computed_values: true,
      }),
      helpers.getCopperUsers(context),
      helpers.callApiBasicCached(context, "account"),
      helpers.callApiBasicCached(context, "contact_types"),
      helpers.callApiBasicCached(context, "custom_field_definitions"),
    ]);

  // Process the results by sending each person to the enrichment function
  let people = response.body.map((person) =>
    helpers.enrichPersonResponse(
      person,
      copperAccount.id,
      users,
      contactTypes,
      customFieldDefinitions
    )
  );

  // If we got a full page of results, that means there are probably more results
  // on the next page. Set up a continuation to grab the next page if so.
  let nextContinuation = undefined;
  if (people.length == constants.PAGE_SIZE)
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
    customFieldDefinitions,
  ] = await Promise.all([
    helpers.callApi(context, "opportunities/" + opportunityId.id, "GET", {
      custom_field_computed_values: true,
    }),
    helpers.getCopperUsers(context),
    helpers.callApiBasicCached(context, "account"),
    helpers.callApiBasicCached(context, "pipelines"),
    helpers.callApiBasicCached(context, "customer_sources"),
    helpers.callApiBasicCached(context, "loss_reasons"),
    helpers.callApiBasicCached(context, "custom_field_definitions"),
  ]);

  let opportunity = await helpers.enrichOpportunityResponse(
    response.body,
    copperAccount.id,
    users,
    pipelines,
    customerSources,
    lossReasons,
    customFieldDefinitions,
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
    customFieldDefinitions,
  ] = await Promise.all([
    helpers.callApi(context, "people/" + opportunityId.id, "GET", {
      custom_field_computed_values: true,
    }),
    helpers.getCopperUsers(context),
    helpers.callApiBasicCached(context, "account"),
    helpers.callApiBasicCached(context, "contact_types"),
    helpers.callApiBasicCached(context, "custom_field_definitions"),
  ]);

  let person = await helpers.enrichPersonResponse(
    response.body,
    copperAccount.id,
    users,
    contactTypes,
    customFieldDefinitions
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
    customFieldDefinitions, // account-level list of custom fields
  ] = await Promise.all([
    helpers.callApi(context, "companies/" + opportunityId.id, "GET", {
      custom_field_computed_values: true,
    }),
    helpers.getCopperUsers(context),
    helpers.callApiBasicCached(context, "account"),
    helpers.callApiBasicCached(context, "custom_field_definitions"),
  ]);

  let company = await helpers.enrichCompanyResponse(
    response.body,
    copperAccount.id,
    users,
    customFieldDefinitions
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

export async function updateOpportunityStage(
  context: coda.ExecutionContext,
  urlOrId: string,
  newStageName: string
) {
  const opportunityId = helpers.getIdFromUrlOrId(urlOrId);
  helpers.checkRecordIdType(opportunityId.type, "opportunity");

  // Get opportunity details and pipelines (which include stage lists)
  let [existingResponse, pipelines] = await Promise.all([
    helpers.callApi(context, "opportunities/" + opportunityId.id, "GET"),
    helpers.callApiBasicCached(context, "pipelines"),
  ]);
  let opportunity = existingResponse.body;

  // Grab the pipeline associated with the opportunity
  let pipeline = pipelines.find(
    (pipeline) => pipeline.id === (opportunity.pipeline_id as string)
  );

  // Grab the stage that matches the requested stage name
  let newStage = pipeline.stages.find(
    (stage) => stage.name.toLowerCase() === newStageName.toLowerCase()
  );
  if (!newStage) {
    throw new coda.UserVisibleError(
      "Stage must be " +
        helpers.humanReadableList(pipeline.stages.map(({ name }) => name))
    );
  }

  // Update the stage
  let response = await helpers.callApi(
    context,
    "opportunities/" + opportunityId.id,
    "PUT",
    { pipeline_stage_id: newStage.id }
  );
  return await helpers.enrichOpportunityResponseWithFetches(
    context,
    response.body
  );
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
  let endpoint = helpers.getRecordApiEndpoint(recordType, recordId.id);
  // Update the record (the API will respond with the updated record, so
  // we'll hang onto that too)
  let response = await helpers.callApi(context, endpoint, "PUT", payload);
  // Enrich the updated record and prepare it for insertion back into the sync table
  return await helpers.enrichResponseWithFetches(
    context,
    recordType,
    response.body
  );
}

export async function addOrRemoveTag(
  context: coda.ExecutionContext,
  recordType: "opportunity" | "person" | "company",
  urlOrId: string,
  tag: string,
  remove = false // if true, remove the tag instead of adding it
) {
  const recordId = helpers.getIdFromUrlOrId(urlOrId);
  helpers.checkRecordIdType(recordId.type, recordType);

  let endpoint = helpers.getRecordApiEndpoint(recordType, recordId.id);

  let existingResponse = await helpers.callApi(context, endpoint, "GET");
  let tags: string[] = existingResponse.body.tags;

  if (remove) {
    tags = tags.filter((candidateTag) => candidateTag !== tag);
  } else {
    tags.push(tag);
  }

  let response = await helpers.callApi(context, endpoint, "PUT", {
    tags: tags,
  });
  return await helpers.enrichResponseWithFetches(
    context,
    recordType,
    response.body
  );
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

export async function getPipelineStages(
  context: coda.ExecutionContext,
  urlOrId: string
) {
  const opportunityId = helpers.getIdFromUrlOrId(urlOrId);
  helpers.checkRecordIdType(opportunityId.type, "opportunity");
  let endpoint = helpers.getRecordApiEndpoint("opportunity", opportunityId.id);
  let [existingResponse, pipelines] = await Promise.all([
    helpers.callApi(context, endpoint, "GET"),
    helpers.callApiBasicCached(context, "pipelines"),
  ]);
  let opportunity = existingResponse.body;
  return pipelines
    .find(
      (pipeline) =>
        (pipeline.id as string) === (opportunity.pipeline_id as string)
    )
    .stages.map((stage) => stage.name);
}
