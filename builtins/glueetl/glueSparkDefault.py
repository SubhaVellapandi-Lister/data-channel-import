import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.sql import SQLContext
from awsglue.context import GlueContext
from awsglue.dynamicframe import DynamicFrame
from awsglue.job import Job
import boto3

## @params: [JOB_NAME]
args = getResolvedOptions(sys.argv, [
    'JOB_NAME',
    'aws_region',
    's3_output_path',
    'glue_database',
    'glue_table_name',
    'spark_sql_table_name',
    'spark_sql_query'
])

print(args)

aws_region = args['aws_region']
s3_path = args['s3_output_path']
glue_database = args['glue_database']
glue_table_name = args['glue_table_name']
spark_sql_table_names = args['spark_sql_table_name']
spark_sql_query = args['spark_sql_query']
target_format = "csv"

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

if glue_table_name != 'UNSET':
    datasource = glueContext.create_dynamic_frame.from_catalog(database = glue_database, table_name = glue_table_name)
    dataOutFrame = datasource.coalesce(1)
else:
    sqlContext = SQLContext(spark.sparkContext, spark)

    for table_name in spark_sql_table_names.split(','):
        datasource = glueContext.create_dynamic_frame.from_catalog(database = glue_database, table_name = table_name)
        tempDataFrame = datasource.toDF()
        tempDataFrame.createOrReplaceTempView(table_name)

    queryDf = sqlContext.sql(spark_sql_query)
    dataOutFrame = DynamicFrame.fromDF(queryDf.coalesce(1), glueContext, "dataOutFrame")


datasink = glueContext.write_dynamic_frame.from_options(
    frame = dataOutFrame,
    connection_type = "s3",
    connection_options = {"path": s3_path},
    format = target_format
)

job.commit()