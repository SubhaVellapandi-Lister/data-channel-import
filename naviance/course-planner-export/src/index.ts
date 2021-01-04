import { generateHandler, BaseProcessor, Job } from "@data-channels/dcSDK";
import { CoursesExportProcessor } from "./processors/CoursesExportProcessor";
import { MappingExportProcessor } from "./processors/MappingExportProcessor";
import { ProgramExportProcessor } from "./processors/ProgramExportProcessor";
import { RecommendationExportProcessor } from "./processors/RecommendationExportProcessor";
import { SchoolsProcessor } from "./processors/SchoolsProcessor";
import { StudentCourseExportProcessor } from "./processors/StudentCourseExportProcessor";
import { InitiateExportsProcessor } from "./processors/InitiateExportsProcessor";

import {  } from "@data-channels/dcSDK";

export const exportHandler = generateHandler({
    findSchools: SchoolsProcessor,
    exportPrograms: ProgramExportProcessor,
    exportStudentCourses: StudentCourseExportProcessor,
    exportRecommendations: RecommendationExportProcessor,
    exportMappings: MappingExportProcessor,
    exportCourses: CoursesExportProcessor,
    initiateExports: InitiateExportsProcessor
});
