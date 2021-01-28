import { SchemaType, ValidateDataType } from "./Validate.interface";

export const fieldTypeMap: {
  [key: string]: ValidateDataType;
} = {
    [SchemaType.Date]: ValidateDataType.Datetime,
    [SchemaType.Number]: ValidateDataType.Integer
}
