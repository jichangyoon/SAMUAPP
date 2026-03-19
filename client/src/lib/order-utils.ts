export const statusLabels: Record<string, string> = {
  draft: "Confirmed",
  pending: "Confirmed",
  confirmed: "Confirmed",
  in_production: "In Production",
  inprocess: "In Production",
  fulfilled: "Shipped",
  shipped: "Shipped",
  in_transit: "Shipped",
  delivered: "Delivered",
  returned: "Returned",
  failed: "Failed",
  canceled: "Canceled",
  cancelled: "Canceled",
};

export const getStatusLabel = (status: string): string => {
  return statusLabels[status] || "In Queue";
};

export const statusOrder: Record<string, number> = {
  confirmed: 0,
  pending: 0,
  draft: 0,
  in_production: 1,
  inprocess: 1,
  fulfilled: 2,
  shipped: 2,
  in_transit: 2,
  delivered: 3,
  completed: 3,
  canceled: -1,
  cancelled: -1,
  failed: -1,
  error: -1,
};
