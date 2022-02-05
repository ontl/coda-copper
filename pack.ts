import * as coda from "@codahq/packs-sdk";
import * as schemas from "./schemas";
import * as constants from "./constants";
import * as formulas from "./formulas";

export const pack = coda.newPack();

pack.addNetworkDomain("copper.com");
pack.setUserAuthentication({
  type: coda.AuthenticationType.Custom,
  params: [
    {
      name: "apiKey",
      description: "API Key from Copper (Settings > Integrations > API Keys)",
    },
    {
      name: "email",
      description: "The email associated with your Copper account",
    },
  ],
  instructionsUrl:
    "https://coda.io/@nickhe/copper-pack-for-coda/getting-started-2",
});

/* -------------------------------------------------------------------------- */
/*                                 Sync Tables                                */
/* -------------------------------------------------------------------------- */

pack.addSyncTable({
  name: "Opportunities",
  identityName: "Opportunity",
  // Copper users can define custom fields, and we want to be able to include those
  // as columns. That means we'll be making a dynamic schema. We still have to define
  // a regular static schema first, which is used as a placeholder until the full
  // dynamic schema is generated.
  schema: schemas.OpportunitySchema,
  // Now we'll add a dynamic version of the schema, which includes the custom fields
  dynamicOptions: {
    getSchema: async function (context) {
      return schemas.getSchemaWithCustomFields(context, "opportunity");
    },
  },
  formula: {
    name: "SyncOpportunities",
    description: "Sync opportunities from Copper",
    cacheTtlSecs: 0, // don't cache results
    parameters: [],
    execute: async function ([], context) {
      return formulas.syncOpportunities(context);
    },
  },
});

pack.addSyncTable({
  name: "Companies",
  identityName: "Company",
  schema: schemas.CompanySchema,
  dynamicOptions: {
    getSchema: async function (context) {
      return schemas.getSchemaWithCustomFields(context, "company");
    },
  },
  formula: {
    name: "SyncCompanies",
    description: "Sync companies from Copper",
    cacheTtlSecs: 0, // don't cache results
    parameters: [],
    execute: async function ([], context) {
      return formulas.syncCompanies(context);
    },
  },
});

pack.addSyncTable({
  name: "People",
  identityName: "Person",
  schema: schemas.PersonSchema,
  dynamicOptions: {
    getSchema: async function (context) {
      return schemas.getSchemaWithCustomFields(context, "person");
    },
  },
  formula: {
    name: "SyncPeople",
    description: "Sync people from Copper",
    cacheTtlSecs: 0, // don't cache results
    parameters: [],
    execute: async function ([], context) {
      return formulas.syncPeople(context);
    },
  },
});

/* -------------------------------------------------------------------------- */
/*                                  Formulas                                  */
/* -------------------------------------------------------------------------- */

// Read-only formulas

pack.addFormula({
  name: "Opportunity",
  description:
    "Gets all the details of a Copper Opportunity, based on its URL or ID",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the opportunity",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.OpportunitySchema,
  execute: async function ([urlOrId], context) {
    return formulas.getOpportunity(context, urlOrId);
  },
});

pack.addFormula({
  name: "Company",
  description:
    "Gets all the details of a Copper Company, based on its URL or ID",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the company",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.CompanySchema,
  execute: async function ([urlOrId], context) {
    return formulas.getCompany(context, urlOrId);
  },
});

pack.addFormula({
  name: "Person",
  description:
    "Gets all the details of a Copper Person (contact), based on its URL or ID",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the person",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.PersonSchema,
  execute: async function ([urlOrId], context) {
    return formulas.getPerson(context, urlOrId);
  },
});

/* -------------------------------------------------------------------------- */
/*                               Column Formats                               */
/* -------------------------------------------------------------------------- */

pack.addColumnFormat({
  name: "Opportunity",
  instructions:
    "Displays all the details of Copper Opportunities, based on their URL or Copper ID",
  formulaName: "Opportunity",
  matchers: [constants.copperOpportunityUrlRegex],
});

pack.addColumnFormat({
  name: "Company",
  instructions:
    "Displays all the details of Copper Companies, based on their URL or ID",
  formulaName: "Company",
  matchers: [constants.copperCompanyUrlRegex],
});

pack.addColumnFormat({
  name: "Person",
  instructions:
    "Displays all the details of Copper People (contacts), based on their URL or Copper ID",
  formulaName: "Person",
  matchers: [constants.copperPersonUrlRegex],
});

/* -------------------------------------------------------------------------- */
/*                                   Actions                                  */
/* -------------------------------------------------------------------------- */

pack.addFormula({
  name: "UpdateOpportunityStatus",
  description: "Changes the status of a Copper Opportunity",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the opportunity",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "newStatus",
      description: "The new status to set on the opportunity",
      autocomplete: constants.STATUS_OPTIONS,
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "lossReason",
      description: "If changing to Lost, the reason for the loss",
      optional: true,
      autocomplete: async function (context) {
        return formulas.getLossReasons(context);
      },
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.OpportunitySchema,
  isAction: true,
  execute: async function ([urlOrId, newStatus, lossReason], context) {
    return formulas.updateOpportunityStatus(
      context,
      urlOrId,
      newStatus,
      lossReason
    );
  },
});

/* --------------------------------- Assign --------------------------------- */
// Shouldn't we have a single Assign() formula, that can accept URLs of any
// record type? That would be marvellous, but we have to speficy ahead of time
// which schema we'll be returning. Currently, we can't change the schema
// dynamically on a formula, the way we can on a sync table :(

pack.addFormula({
  name: "AssignOpportunity",
  description: "Assign a Copper Opportunity to someone on your team",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the opportunity",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "assigneeEmail",
      description: "The email address of the person you want to assign it to",
      autocomplete: async function (context) {
        return formulas.getUsers(context);
      },
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.OpportunitySchema,
  isAction: true,
  execute: async function ([urlOrId, assigneeEmail], context) {
    return formulas.assignRecord(
      context,
      "opportunity",
      urlOrId,
      assigneeEmail
    );
  },
});

pack.addFormula({
  name: "AssignPerson",
  description: "Assign a Copper Person (customer) to someone on your team",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the Copper 'Person' (customer)",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "assigneeEmail",
      description: "The email address of the assignee (your colleague)",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.PersonSchema,
  isAction: true,
  execute: async function ([urlOrId, assigneeEmail], context) {
    return formulas.assignRecord(context, "person", urlOrId, assigneeEmail);
  },
});

pack.addFormula({
  name: "AssignCompany",
  description: "Assign a Copper Company to someone on your team",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the company",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "assigneeEmail",
      description: "The email address of the person you want to assign it to",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.CompanySchema,
  isAction: true,
  execute: async function ([urlOrId, assigneeEmail], context) {
    return formulas.assignRecord(context, "company", urlOrId, assigneeEmail);
  },
});

/* --------------------------------- Add Tag -------------------------------- */

pack.addFormula({
  name: "TagOpportunity",
  description: "Add a tag to a Copper Opportunity",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the opportunity",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "tag",
      description: "The tag to apply to the opportunity",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.OpportunitySchema,
  isAction: true,
  execute: async function ([urlOrId, tag], context) {
    return formulas.addOrRemoveTag(context, "opportunity", urlOrId, tag);
  },
});

pack.addFormula({
  name: "TagPerson",
  description: "Add a tag to a Copper Person",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the person",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "tag",
      description: "The tag to apply to the person",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.PersonSchema,
  isAction: true,
  execute: async function ([urlOrId, tag], context) {
    return formulas.addOrRemoveTag(context, "person", urlOrId, tag);
  },
});

pack.addFormula({
  name: "TagCompany",
  description: "Add a tag to a Copper Company",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the company",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "tag",
      description: "The tag to apply to the company",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.CompanySchema,
  isAction: true,
  execute: async function ([urlOrId, tag], context) {
    return formulas.addOrRemoveTag(context, "company", urlOrId, tag);
  },
});

/* ------------------------------- Remove Tag ------------------------------- */

pack.addFormula({
  name: "UntagOpportunity",
  description: "Remove a tag from a Copper Opportunity",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the opportunity",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "tag",
      description: "The tag to remove from the opportunity",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.OpportunitySchema,
  isAction: true,
  execute: async function ([urlOrId, tag], context) {
    return formulas.addOrRemoveTag(context, "opportunity", urlOrId, tag, true);
  },
});

pack.addFormula({
  name: "UntagPerson",
  description: "Remove a tag from a Copper Person",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the person",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "tag",
      description: "The tag to remove from the person",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.PersonSchema,
  isAction: true,
  execute: async function ([urlOrId, tag], context) {
    return formulas.addOrRemoveTag(context, "person", urlOrId, tag, true);
  },
});

pack.addFormula({
  name: "UntagCompany",
  description: "Remove a tag from a Copper Company",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "urlOrId",
      description: "The URL or ID of the company",
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "tag",
      description: "The tag to remove from the company",
    }),
  ],
  resultType: coda.ValueType.Object,
  schema: schemas.CompanySchema,
  isAction: true,
  execute: async function ([urlOrId, tag], context) {
    return formulas.addOrRemoveTag(context, "company", urlOrId, tag, true);
  },
});
