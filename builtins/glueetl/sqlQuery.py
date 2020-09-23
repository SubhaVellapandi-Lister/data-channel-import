import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
import boto3

## @params: [JOB_NAME]
args = getResolvedOptions(sys.argv, ['JOB_NAME'])

aws_region = "$AWS_REGION"
s3_path = "$S3_OUTPUT_PATH"
glue_database = "$GLUE_DB_NAME"
table_name = "$GLUE_TABLE_NAME"
target_format = "csv"

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)


selected_source = glueContext.create_dynamic_frame.from_catalog(database = "data-pipeline-lake-staging", table_name = "selected", transformation_ctx="selected_source")
applymapping_selected = ApplyMapping.apply(frame = selected_source, mappings = [("user_id", "string", "user_id", "string"), ("column_count", "int", "column_count", "int")], transformation_ctx = "applymapping_selected")
selected_fields = SelectFields.apply(frame = applymapping_selected, paths = ["user_id","column_count"], transformation_ctx = "selected_fields")
resolvechoiceselected0 = ResolveChoice.apply(frame = selected_fields, choice = "MATCH_CATALOG", database = "data-pipeline-lake-staging", table_name = "selected", transformation_ctx = "resolvechoiceselected0")
resolvechoiceselected1 = ResolveChoice.apply(frame = resolvechoiceselected0, choice = "make_struct", transformation_ctx = "resolvechoiceselected1")
selected_df = resolvechoiceselected1.toDF()
selected_df.createOrReplaceTempView("selected_temp_table")

consolidated_df = spark.sql("""
SELECT
A.user_id,
A.gender,
A.age,
A.year_of_birth,
A.address_continent,
A.address_region,
A.address_country,
A.address_lga,
A.address_state,
A.phone_type,
A.profile_value,
A.browser_name,
A.browser_version,
A.phone_manufacturer,
A.phone_model,
A.os_vendor,
A.os_name,
A.os_version,
A.os_sub_version,
A.spend_total,
A.channel,
A.service_name,
A.service_cost,
A.interest,
B.column_count
FROM profiles_temp_table A
LEFT JOIN selected_temp_table B
ON A.user_id=B.user_id
""")
output_df = consolidated_df.orderBy('column_count', ascending=False)

consolidated_dynamicframe = DynamicFrame.fromDF(output_df.repartition(1), glueContext, "consolidated_dynamicframe")
datasink_output = glueContext.write_dynamic_frame.from_options(
    frame = consolidated_dynamicframe,
    connection_type = "s3",
    connection_options = {"path": "s3://data-store-staging/tutorial/"},
    format = "parquet", transformation_ctx = "datasink_output")

datasource = glueContext.create_dynamic_frame.from_catalog(database = glue_database, table_name = table_name)
datasourceCoalesce = datasource.coalesce(1)
datasink = glueContext.write_dynamic_frame.from_options(
    frame = datasourceCoalesce,
    connection_type = "s3",
    connection_options = {"path": s3_path},
    format = target_format
)

job.commit()