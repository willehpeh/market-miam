export type RepertoireViewItem = {
  itemId: string;
  name: string;
  description: string;
  price: number;
  photoUrl: string;
};

export type RepertoireView = {
  items: RepertoireViewItem[];
};
