export const BASE_URL = "https://api.copper.com/developer_api/v1/";
export const PAGE_SIZE = 50; // max accepted by the API is 200, but that can crash Pack execution
export const STATUS_OPTIONS = ["Open", "Won", "Lost", "Abandoned"];
export const RECORD_TYPES = [
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
