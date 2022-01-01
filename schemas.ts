import * as coda from "@codahq/packs-sdk";

/* -------------------------------------------------------------------------- */
/*                            Common object schemas                           */
/* -------------------------------------------------------------------------- */

const CopperUserSchema = coda.makeObjectSchema({
  codaType: coda.ValueHintType.Person,
  properties: {
    email: { type: coda.ValueType.String, required: true },
    name: { type: coda.ValueType.String },
    copperUserId: { type: coda.ValueType.String },
  },
  primary: "name",
  id: "email",
});

const PhoneNumberSchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  primary: "number",
  id: "number",
  properties: {
    number: {
      type: coda.ValueType.String,
      description: "Phone number",
    },
    category: {
      type: coda.ValueType.String,
      description: "Phone number category",
    },
  },
});

const EmailAddressSchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  primary: "email",
  id: "email",
  properties: {
    email: {
      type: coda.ValueType.String,
      description: "Email address",
    },
    category: {
      type: coda.ValueType.String,
      description: "Email category",
    },
  },
});

const SocialSchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  primary: "category",
  id: "url",
  properties: {
    url: {
      type: coda.ValueType.String,
      description: "Social media URL",
      codaType: coda.ValueHintType.Url,
    },
    category: {
      type: coda.ValueType.String,
      description: "Social media category",
    },
  },
});

const WebsiteSchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  primary: "url",
  id: "url",
  properties: {
    url: {
      type: coda.ValueType.String,
      description: "Website URL",
      codaType: coda.ValueHintType.Url,
    },
    category: {
      type: coda.ValueType.String,
      description: "Website category",
    },
  },
});

/* -------------------------------------------------------------------------- */
/*                             Sync table schemas                             */
/* -------------------------------------------------------------------------- */

export const CompanySchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  id: "companyId",
  primary: "companyName",
  featured: ["fullAddress", "emailDomain", "interactionCount", "url"],
  identity: { name: "Company" },
  properties: {
    companyId: {
      type: coda.ValueType.String,
      description: "Company ID on Copper",
      required: true,
      fromKey: "id",
    },
    companyName: {
      type: coda.ValueType.String,
      description: "Company name",
      required: true,
      fromKey: "name",
    },
    fullAddress: {
      // synthetic address property (combining all address fields)
      type: coda.ValueType.String,
      description: "Company address",
    },
    street: {
      type: coda.ValueType.String,
      description: "Address: street",
      fromKey: "address.street",
    },
    city: {
      type: coda.ValueType.String,
      description: "Address: city",
      fromKey: "address.city",
    },
    state: {
      type: coda.ValueType.String,
      description: "Address: state",
      fromKey: "address.state",
    },
    postalCode: {
      type: coda.ValueType.String,
      description: "Address: postal code",
      fromKey: "address.postal_code",
    },
    country: {
      type: coda.ValueType.String,
      description: "Address: country",
      fromKey: "address.country",
    },
    assigneeId: {
      type: coda.ValueType.String,
      description: "Assignee ID on Copper",
      fromKey: "assignee_id",
    },
    assignee: CopperUserSchema,
    contactTypeId: {
      type: coda.ValueType.String,
      description: "Contact type ID on Copper",
      fromKey: "contact_type_id",
    },
    details: {
      type: coda.ValueType.String,
      description: "Company details",
    },
    emailDomain: {
      type: coda.ValueType.String,
      description: "Email domain",
      fromKey: "email_domain",
    },
    phoneNumbers: {
      type: coda.ValueType.Array,
      description: "Phone numbers",
      fromKey: "phone_numbers",
      items: PhoneNumberSchema,
    },
    socials: {
      type: coda.ValueType.Array,
      description: "Social media links",
      items: SocialSchema,
    },
    tags: {
      type: coda.ValueType.Array,
      description: "Tags",
      items: coda.makeSchema({
        type: coda.ValueType.String,
      }),
    },
    websites: {
      type: coda.ValueType.Array,
      description: "Websites",
      items: WebsiteSchema,
    },
    interactionCount: {
      type: coda.ValueType.Number,
      description: "Number of interactions with this company",
      fromKey: "interaction_count",
    },
    dateCreated: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Date,
      description: "Date created",
      fromKey: "date_created",
    },
    dateModified: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Date,
      description: "Date modified",
      fromKey: "date_modified",
    },
    url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: "View Comapny on Copper",
    },
  },
});

export const CompanyReferenceSchema =
  coda.makeReferenceSchemaFromObjectSchema(CompanySchema);

export const PersonSchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  id: "personId",
  primary: "fullName",
  featured: ["company", "assignee", "url"],
  identity: { name: "Person" },
  properties: {
    personId: {
      type: coda.ValueType.String,
      description: "Person ID on Copper",
      required: true,
      fromKey: "id",
    },
    fullName: {
      type: coda.ValueType.String,
      description: "Person name",
      required: true,
      fromKey: "name",
    },
    prefix: {
      type: coda.ValueType.String,
      description: "Prefix",
    },
    firstName: {
      type: coda.ValueType.String,
      description: "First name",
      fromKey: "first_name",
    },
    middleName: {
      type: coda.ValueType.String,
      description: "Middle name",
      fromKey: "middle_name",
    },
    lastName: {
      type: coda.ValueType.String,
      description: "Last name",
      fromKey: "last_name",
    },
    suffix: {
      type: coda.ValueType.String,
      description: "Name suffix",
    },
    title: {
      type: coda.ValueType.String,
      description: "Title",
    },
    fullAddress: {
      // synthetic address property (combining all address fields)
      type: coda.ValueType.String,
      description: "Full address",
    },
    street: {
      type: coda.ValueType.String,
      description: "Address: street",
      fromKey: "address.street",
    },
    city: {
      type: coda.ValueType.String,
      description: "Address: city",
      fromKey: "address.city",
    },
    state: {
      type: coda.ValueType.String,
      description: "Address: state",
      fromKey: "address.state",
    },
    postalCode: {
      type: coda.ValueType.String,
      description: "Address: postal code",
      fromKey: "address.postal_code",
    },
    country: {
      type: coda.ValueType.String,
      description: "Address: country",
      fromKey: "address.country",
    },
    company: CompanyReferenceSchema,
    assignee: CopperUserSchema,
    contactType: {
      type: coda.ValueType.String,
      description: "Type of contact",
    },
    details: {
      type: coda.ValueType.String,
      description: "Details",
    },
    emails: {
      type: coda.ValueType.Array,
      description: "Email addresses",
      items: EmailAddressSchema,
    },
    phoneNumbers: {
      type: coda.ValueType.Array,
      description: "Phone numbers",
      items: PhoneNumberSchema,
    },
    socials: {
      type: coda.ValueType.Array,
      description: "Social media links",
      items: SocialSchema,
    },
    tags: {
      type: coda.ValueType.Array,
      description: "Tags",
      items: coda.makeSchema({
        type: coda.ValueType.String,
      }),
    },
    websites: {
      type: coda.ValueType.Array,
      description: "Websites",
      items: WebsiteSchema,
    },
    interactionCount: {
      type: coda.ValueType.Number,
      description: "Number of interactions with this person",
      fromKey: "interaction_count",
    },
    dateCreated: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Date,
      description: "Date created",
      fromKey: "date_created",
    },
    dateModified: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Date,
      description: "Date modified",
      fromKey: "date_modified",
    },
    url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: "View Person on Copper",
    },
  },
});

export const PersonReferenceSchema =
  coda.makeReferenceSchemaFromObjectSchema(PersonSchema);

export const OpportunitySchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  id: "opportunityId",
  primary: "opportunityName",
  featured: ["company", "status", "monetaryValue", "closeDate", "url"],
  identity: { name: "Opportunity" },
  properties: {
    opportunityId: {
      type: coda.ValueType.String,
      description: "Copper ID of the opportunity",
      required: true,
      fromKey: "id",
    },
    opportunityName: {
      type: coda.ValueType.String,
      description: "Name of the opportunity",
      fromKey: "name",
    },
    assigneeId: {
      type: coda.ValueType.String,
      fromKey: "assignee_id",
    },
    assignee: CopperUserSchema,
    closeDate: {
      type: coda.ValueType.String, // yep, for some reason this is a string while others are unix epoch
      codaType: coda.ValueHintType.Date,
      description: "Close date of the opportunity",
      fromKey: "close_date",
    },
    company: CompanyReferenceSchema,
    companyId: {
      type: coda.ValueType.String,
      description: "Id of the related company",
      fromKey: "company_id",
    },
    companyName: {
      type: coda.ValueType.String,
      description: "Name of the related company",
      fromKey: "company_name",
    },
    customerSource: {
      type: coda.ValueType.String,
      description: "Customer source",
    },
    details: {
      type: coda.ValueType.String,
      description: "Opportunity details",
    },
    lossReason: {
      type: coda.ValueType.String,
      description: "The reason for losing the opportunity",
    },
    pipeline: {
      type: coda.ValueType.String,
      description: "The pipeline the opportunity belongs to",
    },
    pipelineStage: {
      type: coda.ValueType.String,
      description: "Stage of the pipeline that the opportunity is in",
    },
    primaryContactId: {
      type: coda.ValueType.String,
      description: "Primary customer contact ID",
      fromKey: "primary_contact_id",
    },
    primaryContact: PersonReferenceSchema,
    status: {
      type: coda.ValueType.String,
      description: "Status of the opportunity",
    },
    tags: {
      type: coda.ValueType.Array,
      items: coda.makeSchema({
        type: coda.ValueType.String,
      }),
      description: "Opportunity tags",
    },
    interactionCount: {
      type: coda.ValueType.Number,
      description: "Number of interactions related to this opportunity",
      fromKey: "interaction_count",
    },
    monetaryValue: {
      type: coda.ValueType.Number,
      description: "Expected value of the opportunity",
      fromKey: "monetary_value",
    },
    winProbability: {
      type: coda.ValueType.Number,
      description: "Probability of winning",
      fromKey: "win_probability",
    },
    dateLastContacted: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Date,
      description: "Date of last contact",
      fromKey: "date_last_contacted",
    },
    // leadsConvertedFrom: {
    //   type: coda.ValueType.Array,
    //   items: coda.makeSchema({
    //     type: coda.ValueType.String
    //   }),
    //   description: "Leads the opportunity was converted from",
    // },
    // dateLeadCreated: {
    //   type: coda.ValueType.Number,
    //   codaType: coda.ValueHintType.Date,
    //   description: "Date the lead was created on",
    //   fromKey: "date_lead_created",
    // },
    dateCreated: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Date,
      description: "Date the opportunity was created on",
      fromKey: "date_created",
    },
    dateModified: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Date,
      description: "Date the opportunity was last modified on",
      fromKey: "date_modified",
    },
    // TODO: Implement custom fields
    url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: "View Opportunity on Copper",
    },
  },
});

// Sample response for Opportunities
//         "id": 2827699,
//         "name": "25 Office Chairs (sample)",
//         "assignee_id": null,
//         "close_date": "1/16/2017",
//         "company_id": 9607580,
//         "company_name": "Dunder Mifflin (sample)",
//         "customer_source_id": 331242,
//         "details": "Opportunities are created for People and Companies that are interested in buying your products or services. Create Opportunities for People and Companies to move them through one of your Pipelines.",
//         "loss_reason_id": null,
//         "pipeline_id": 213214,
//         "pipeline_stage_id": 987793,
//         "primary_contact_id": null,
//         "priority": "None",
//         "status": "Open",
//         "tags": [],
//         "interaction_count": 0,
//         "monetary_value": 75000,
//         "win_probability": 40,
//         "date_last_contacted": null,
//         "leads_converted_from": [],
//         "date_lead_created": null,
//         "date_created": 1483988829,
//         "date_modified": 1489018922,
//         "custom_fields": [
//             {
//                 "custom_field_definition_id": 126240,
//                 "value": null
//             },
//             {
//                 "custom_field_definition_id": 103481,
//                 "value": null
//             },
//             {
//                 "custom_field_definition_id": 100764,
//                 "value": null
//             }
//         ]
//     },

// Sample response for companies
// "id": 13358412,
// "name": "Demo Company",
// "address": {
//     "street": "123 Main St",
//     "city": "San Francisco",
//     "state": "CA",
//     "postal_code": "94105",
//     "country": null
// },
// "assignee_id": null,
// "contact_type_id": null,
// "details": "This is a demo company",
// "email_domain": "democompany.com",
// "phone_numbers": [
//     {
//         "number": "415-123-45678",
//         "category": "work"
//     }
// ],
// "socials": [],
// "tags": [],
// "websites": [
//     {
//         "url": "http://democompany.com",
//         "category": "work"
//     }
// ],
// "custom_fields": [
//     {
//         "custom_field_definition_id": 100764,
//         "value": null
//     },
//     {
//         "custom_field_definition_id": 103481,
//         "value": null
//     }
// ],
// "interaction_count": 0,
// "date_created": 1496707930,
// "date_modified": 1496707932
// }

// sample API response for people:
//         "id": 27140338,
//         "name": "My Contact",
//         "prefix": null,
//         "first_name": "My",
//         "middle_name": null,
//         "last_name": "Contact",
//         "suffix": null,
//         "address": null,
//         "assignee_id": null,
//         "company_id": null,
//         "company_name": null,
//         "contact_type_id": 451492,
//         "details": null,
//         "emails": [],
//         "phone_numbers": [],
//         "socials": [],
//         "tags": [],
//         "title": null,
//         "websites": [],
//         "custom_fields": [
//             {
//                 "custom_field_definition_id": 100764,
//                 "value": "Text fields are 255 chars or less!"
//             },
//             {
//                 "custom_field_definition_id": 103481,
//                 "value": "Text area fields can have long text content"
//             }
//         ],
//         "date_created": 1490044880,
//         "date_modified": 1490044880,
//         "interaction_count": 0
