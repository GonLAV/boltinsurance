export type Attachment = { url: string; name: string; type: string };
export type Step = { id: number; action: string; expectedResult: string; attachment?: Attachment | File };
