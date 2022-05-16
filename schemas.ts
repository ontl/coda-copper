import * as coda from "@codahq/packs-sdk";
import * as helpers from "./helpers";

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
  displayProperty: "name",
  idProperty: "email",
});

const PhoneNumberSchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  displayProperty: "number",
  idProperty: "number",
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
  displayProperty: "email",
  idProperty: "email",
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
  displayProperty: "category",
  idProperty: "url",
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
  displayProperty: "url",
  idProperty: "url",
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
  idProperty: "companyId",
  displayProperty: "companyName",
  featuredProperties: ["fullAddress", "copperUrl", "websites"],
  identity: { name: "Company" },
  properties: {
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
    assignee: CopperUserSchema,
    tags: {
      type: coda.ValueType.Array,
      description: "Tags",
      items: coda.makeSchema({
        type: coda.ValueType.String,
      }),
    },
    copperUrl: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: "View Company on Copper",
      fromKey: "url",
    },
    details: {
      type: coda.ValueType.String,
      description: "Company details",
    },
    phoneNumbers: {
      type: coda.ValueType.Array,
      description: "Phone numbers",
      fromKey: "phone_numbers",
      items: PhoneNumberSchema,
    },
    emailDomain: {
      type: coda.ValueType.String,
      description: "Email domain",
      fromKey: "email_domain",
    },
    interactionCount: {
      type: coda.ValueType.Number,
      description: "Number of interactions with this company",
      fromKey: "interaction_count",
    },
    socials: {
      type: coda.ValueType.Array,
      description: "Social media links",
      items: SocialSchema,
    },
    websites: {
      type: coda.ValueType.Array,
      description: "Websites",
      items: WebsiteSchema,
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
    contactTypeId: {
      type: coda.ValueType.String,
      description: "Contact type ID on Copper",
      fromKey: "contact_type_id",
    },
    assigneeId: {
      type: coda.ValueType.String,
      description: "Assignee ID on Copper",
      fromKey: "assignee_id",
    },
    companyId: {
      type: coda.ValueType.String,
      description: "Company ID on Copper",
      required: true,
      fromKey: "id",
    },
  },
});

export const CompanyReferenceSchema =
  coda.makeReferenceSchemaFromObjectSchema(CompanySchema);

export const PersonSchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  idProperty: "personId",
  displayProperty: "fullName",
  featuredProperties: [
    "title",
    "company",
    "primaryEmail",
    "assignee",
    "copperUrl",
  ],
  identity: { name: "Person" },
  properties: {
    fullName: {
      type: coda.ValueType.String,
      description: "Person name",
      required: true,
      fromKey: "name",
    },
    title: {
      type: coda.ValueType.String,
      description: "Title",
    },
    company: CompanyReferenceSchema,
    assignee: CopperUserSchema,
    copperUrl: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: "View Person on Copper",
      fromKey: "url",
    },
    tags: {
      type: coda.ValueType.Array,
      description: "Tags",
      items: coda.makeSchema({
        type: coda.ValueType.String,
      }),
    },
    contactType: {
      type: coda.ValueType.String,
      description: "Type of contact",
    },
    fullAddress: {
      // synthetic address property (combining all address fields)
      type: coda.ValueType.String,
      description: "Full address",
    },
    details: {
      type: coda.ValueType.String,
      description: "Details",
    },
    primaryEmail: {
      type: coda.ValueType.String,
      description: "Primary email",
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
    websites: {
      type: coda.ValueType.Array,
      description: "Websites",
      items: WebsiteSchema,
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
    personId: {
      type: coda.ValueType.String,
      description: "Person ID on Copper",
      required: true,
      fromKey: "id",
    },
  },
});

export const PersonReferenceSchema =
  coda.makeReferenceSchemaFromObjectSchema(PersonSchema);

export const OpportunitySchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  idProperty: "opportunityId",
  displayProperty: "opportunityName",
  featuredProperties: [
    "company",
    "primaryContact",
    "status",
    "monetaryValue",
    "copperUrl",
  ],
  identity: { name: "Opportunity" },
  properties: {
    opportunityName: {
      type: coda.ValueType.String,
      description: "Name of the opportunity",
      fromKey: "name",
    },
    primaryContact: PersonReferenceSchema,
    company: CompanyReferenceSchema,
    status: {
      type: coda.ValueType.String,
      description: "Status of the opportunity",
    },
    assignee: CopperUserSchema,
    pipelineStage: {
      type: coda.ValueType.String,
      description: "Stage of the pipeline that the opportunity is in",
    },
    closeDate: {
      // for some reason this is a MM/DD/YYYY or DD/MM/YYYY string, while others are unix epoch
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Date,
      description: "Close date of the opportunity",
      fromKey: "close_date",
    },
    monetaryValue: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      description: "Expected value of the opportunity",
      fromKey: "monetary_value",
    },
    copperUrl: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: "View Opportunity on Copper",
      fromKey: "url",
    },
    priority: {
      type: coda.ValueType.String,
      description: "Priority of the opportunity (None, Low, Medium, High)",
    },
    tags: {
      type: coda.ValueType.Array,
      items: coda.makeSchema({
        type: coda.ValueType.String,
      }),
      description: "Opportunity tags",
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
    interactionCount: {
      type: coda.ValueType.Number,
      description: "Number of interactions related to this opportunity",
      fromKey: "interaction_count",
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
    primaryContactId: {
      type: coda.ValueType.String,
      description: "Primary customer contact ID",
      fromKey: "primary_contact_id",
    },
    assigneeId: {
      type: coda.ValueType.String,
      fromKey: "assignee_id",
    },
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
    opportunityId: {
      type: coda.ValueType.String,
      description: "Copper ID of the opportunity",
      required: true,
      fromKey: "id",
    },
  },
});

/* -------------------------------------------------------------------------- */
/*                         Dynamic Sync Table Schemas                         */
/* -------------------------------------------------------------------------- */

export async function getSchemaWithCustomFields(
  context: coda.ExecutionContext,
  recordType: "person" | "company" | "opportunity"
) {
  // First, load up the appropriate static schema, which we'll add on to
  let staticSchema: coda.Schema;
  switch (recordType) {
    case "person":
      staticSchema = PersonSchema;
      break;
    case "company":
      staticSchema = CompanySchema;
      break;
    case "opportunity":
      staticSchema = OpportunitySchema;
      break;
    default:
      throw new coda.UserVisibleError(
        "There was an error generating the sync table"
      );
  }

  // Start with the static properties
  let properties: coda.ObjectSchemaProperties = staticSchema.properties;

  // Go get the list of custom fields
  let allCustomFields = await helpers.callApiBasicCached(
    context,
    "custom_field_definitions"
  );

  // Filter to just the custom fields that apply to this record type
  let applicableCustomFields = allCustomFields.filter((customField) =>
    customField.available_on.includes(recordType)
  );

  // Format the custom fields as schema properties, and add them to the schema
  for (let customField of applicableCustomFields) {
    let name = customField.name;
    console.log("Field name:", name);
    let propertySchema;
    // Build appropriate field schemas based on the type of custom field
    // Note: we're not currently fully implementing the "Connect" field type,
    // but could in future given sufficient user demand
    switch (customField.type) {
      case "Url":
        propertySchema = coda.makeSchema({
          type: coda.ValueType.String,
          codaType: coda.ValueHintType.Url,
        });
        break;
      case "Date":
        propertySchema = coda.makeSchema({
          type: coda.ValueType.Number,
          codaType: coda.ValueHintType.Date,
        });
        break;
      case "Checkbox":
        propertySchema = coda.makeSchema({ type: coda.ValueType.Boolean });
        break;
      case "Float":
        propertySchema = coda.makeSchema({ type: coda.ValueType.Number });
        break;
      case "Percentage":
        propertySchema = coda.makeSchema({ type: coda.ValueType.Number });
        break;
      case "Currency":
        propertySchema = coda.makeSchema({
          type: coda.ValueType.Number,
          codaType: coda.ValueHintType.Currency,
        });
        break;
      case "MultiSelect":
        propertySchema = coda.makeSchema({
          type: coda.ValueType.Array,
          items: coda.makeSchema({
            type: coda.ValueType.String,
          }),
        });
        break;
      default:
        // including String, Text, Dropdown, Connect
        propertySchema = coda.makeSchema({ type: coda.ValueType.String });
    }
    // Add the custom field property to the schema
    console.log("Property Schema:", JSON.stringify(propertySchema));
    properties[name] = propertySchema;
  }

  let schema = coda.makeObjectSchema({
    properties: properties,
    displayProperty: staticSchema.displayProperty,
    idProperty: staticSchema.idProperty,
    featuredProperties: staticSchema.featuredProperties,
    identity: staticSchema.identity,
  });

  // Return an array schema as the result.
  return coda.makeSchema({
    type: coda.ValueType.Array,
    items: schema,
  });
}
