/* -------------------------------------------------------------------------- */
/*                           Copper API Object Types                          */
/* -------------------------------------------------------------------------- */

// Individual properties that appear within API responses
export interface CustomFieldApiProperty {
  // The version of custom fields that appear in another record, such as an
  // opportunity, person, or company.
  custom_field_definition_id: number;
  value: string | number;
}

export interface AddressApiProperty {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: String;
}

export interface LinkApiProperty {
  // used for Socials and Websites
  url: string;
  category: string;
}

export interface PhoneNumberApiProperty {
  number: string;
  category: string;
}

export interface EmailApiProperty {
  email: string;
  category: string;
}

// Complete API responses
export interface OpportunityApiResponse {
  id?: string;
  name: string;
  assignee_id?: string;
  close_date?: string; // MM/DD/YYYY or DD/MM/YYYY format;
  // (most other date fields are unix epoch, but not this one)
  company_id?: string;
  company_name?: string;
  customer_source_id?: string;
  details?: string;
  loss_reason_id?: string;
  monetary_value?: number;
  pipeline_id?: string;
  primary_contact_id?: string;
  priority?: "None" | "Low" | "Medium" | "High";
  pipeline_stage_id?: string;
  status?: "Open" | "Won" | "Lost" | "Abandoned";
  tags?: string[];
  win_probability?: number; // 0-100
  date_created?: number;
  date_modified?: number;
  custom_fields?: CustomFieldApiProperty[];
}

export interface CompanyApiResponse {
  id?: string;
  name: string;
  address?: AddressApiProperty;
  assignee_id?: string;
  contact_type_id?: string;
  details?: string;
  email_domain?: string;
  phone_numbers?: PhoneNumberApiProperty[];
  socials?: LinkApiProperty[];
  tags?: string[];
  websites?: LinkApiProperty[];
  date_created?: number;
  date_modified?: number;
  custom_fields?: CustomFieldApiProperty[];
}

export interface PersonApiResponse {
  id?: string;
  name: string;
  address?: AddressApiProperty;
  assignee_id?: string;
  company_id?: string;
  company_name?: string;
  contact_type_id?: string;
  details?: string;
  emails?: EmailApiProperty[];
  phone_numbers?: PhoneNumberApiProperty[];
  socials?: LinkApiProperty[];
  tags?: string[];
  title?: string;
  websites?: LinkApiProperty[];
  date_created?: number;
  date_modified?: number;
  custom_fields?: CustomFieldApiProperty[];
}

export interface CopperUserApiResponse {
  id: string;
  name: string;
  email: string;
}

export interface BasicApiResponse {
  id: string;
  name: string;
}

export interface PipelineApiResponse {
  id: string;
  name: string;
  stages: {
    id: string;
    name: string;
    win_probability: number; // 0-100
  }[];
}

/* -------------------------------------------------------------------------- */
/*                            Formula Return Types                            */
/* -------------------------------------------------------------------------- */
