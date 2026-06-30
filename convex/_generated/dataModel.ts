// Hand-written stub for the Convex `dataModel.ts`. Mirrors the shape that
// `npx convex dev` generates from `convex/schema.ts`. The `Id` and `Doc`
// helper types let client code refer to documents with strong typing.
//
// Once a real Convex project is provisioned, this file is overwritten by
// codegen and the framework-derived `DataModel` type is reused directly.

import type {
  DataModelFromSchemaDefinition,
  DocumentByName,
  TableNamesInDataModel,
} from "convex/server";
import type { GenericId } from "convex/values";
import schema from "../schema";

export type DataModel = DataModelFromSchemaDefinition<typeof schema>;

export type Id<TableName extends TableNamesInDataModel<DataModel>> = GenericId<TableName>;

export type Doc<TableName extends TableNamesInDataModel<DataModel>> = DocumentByName<DataModel, TableName>;
