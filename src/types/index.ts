export type Route = {
  origin: string;
  destination: string;
  travelDate: string;
};

export type Parcel = {
  description: string;
  route: Route;
  deliverBy: string;
};