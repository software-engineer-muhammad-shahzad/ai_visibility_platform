export interface BusinessProfile {
  uuid: string;
  name: string;
  domain: string;
  industry: string | null;
  description: string | null;
  competitors: string[];
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateProfileRequest {
  name: string;
  domain: string;
  industry: string;
  description: string;
  competitors: string[];
}
