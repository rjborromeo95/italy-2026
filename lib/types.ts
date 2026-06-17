export type Participant = {
  id: string;
  name: string;
  dates: string[]; // ISO "YYYY-MM-DD"
};

export type AvailabilityResponse = {
  configured: boolean;
  participants: Participant[];
  error?: string;
};
