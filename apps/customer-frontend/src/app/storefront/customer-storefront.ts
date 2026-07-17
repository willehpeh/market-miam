export type CustomerStorefront =
  | {
      status: 'published';
      name: string;
      description: string;
      phone: string;
      coverPhoto: string | null;
    }
  | {
      status: 'coming-soon';
      name: string | null;
    };
