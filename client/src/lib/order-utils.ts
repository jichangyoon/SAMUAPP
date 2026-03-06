export const statusLabels: Record<string, string> = {
  draft: "Order Received",
  pending: "Order Received",
  confirmed: "Order Received",
  in_production: "Making Your Sticker",
  inprocess: "Making Your Sticker",
  fulfilled: "On the Way",
  shipped: "On the Way",
  in_transit: "In Transit",
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
