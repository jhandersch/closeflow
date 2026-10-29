export type AppLanguage = "en" | "de";
export type DictionaryLeaf = string;
export type DictionaryNode = {
    [key: string]: DictionaryLeaf | DictionaryNode;
};
