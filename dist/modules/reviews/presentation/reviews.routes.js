"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myReviewsRouter = exports.reviewsRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const email_service_1 = require("../../communications/application/services/email.service");
const file_storage_service_1 = require("../../files/application/services/file-storage.service");
const files_repository_1 = require("../../files/infrastructure/repositories/files.repository");
const iam_repository_1 = require("../../iam/infrastructure/repositories/iam.repository");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const submissions_repository_1 = require("../../submissions/infrastructure/repositories/submissions.repository");
const reviews_repository_1 = require("../infrastructure/repositories/reviews.repository");
const review_schemas_1 = require("./schemas/review.schemas");
exports.reviewsRouter = (0, express_1.Router)();
exports.myReviewsRouter = (0, express_1.Router)();
const reviewsRepository = new reviews_repository_1.ReviewsRepository();
const submissionsRepository = new submissions_repository_1.SubmissionsRepository();
const emailService = new email_service_1.EmailService();
const filesRepository = new files_repository_1.FilesRepository();
const fileStorageService = new file_storage_service_1.FileStorageService();
const iamRepository = new iam_repository_1.IamRepository();
exports.reviewsRouter.get('/events/:eventId/review-teams', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('submissions.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = review_schemas_1.reviewTeamEventParamsSchema.parse(req.params);
    const teams = await reviewsRepository.listProgramReviewTeams(eventId);
    return (0, api_response_1.sendSuccess)(res, 'Program review teams retrieved successfully', teams);
}));
exports.reviewsRouter.put('/events/:eventId/programs/:programId/review-team', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('submissions.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, programId } = review_schemas_1.reviewTeamProgramParamsSchema.parse(req.params);
    const input = review_schemas_1.saveProgramReviewTeamSchema.parse(req.body);
    const saved = await reviewsRepository.saveProgramReviewTeam({
        eventId,
        programId,
        leaderUserId: input.leaderUserId,
        reviewerUserIds: input.reviewerUserIds,
        changedBy: req.user.id,
    });
    if (!saved)
        throw new app_error_1.AppError('Program not found', 404, 'PROGRAM_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'Program review team saved successfully');
}));
exports.reviewsRouter.post('/submissions/:id/assign-reviewer', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = review_schemas_1.reviewSubmissionParamsSchema.parse(req.params);
    const input = review_schemas_1.assignReviewerSchema.parse(req.body);
    const submission = await submissionsRepository.findById(id);
    if (!submission)
        throw new app_error_1.AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    const canAssign = await reviewsRepository.isProgramLeader(id, req.user.id);
    if (!canAssign)
        throw new app_error_1.AppError('Only the program leader can assign reviewers', 403, 'FORBIDDEN');
    if (!await reviewsRepository.isReviewerInSubmissionTeam(id, input.reviewerUserId)) {
        throw new app_error_1.AppError('Reviewer does not belong to this program team', 409, 'REVIEWER_NOT_IN_PROGRAM_TEAM');
    }
    if (await reviewsRepository.findReviewerAssignment(id, input.reviewerUserId)) {
        throw new app_error_1.AppError('Este revisor ya está asignado a este trabajo.', 409, 'REVIEWER_ALREADY_ASSIGNED');
    }
    const assignment = await reviewsRepository.assignReviewer({
        submissionId: id,
        reviewerUserId: input.reviewerUserId,
        rubricId: input.rubricId,
        dueAt: input.dueAt,
        assignedBy: req.user.id,
    });
    const reviewer = await iamRepository.findUserById(input.reviewerUserId);
    if (reviewer)
        await emailService.sendTemplate('review_assigned', reviewer.email, {
            submissionTitle: submission.title,
        });
    return (0, api_response_1.sendSuccess)(res, 'Reviewer assigned successfully', assignment, 201);
}));
exports.reviewsRouter.delete('/reviews/:id/assignment', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = review_schemas_1.reviewIdParamsSchema.parse(req.params);
    const assignment = await reviewsRepository.findReview(id);
    if (!assignment)
        throw new app_error_1.AppError('Review assignment not found', 404, 'REVIEW_ASSIGNMENT_NOT_FOUND');
    const canRemove = await reviewsRepository.isProgramLeader(assignment.submission_id, req.user.id);
    if (!canRemove)
        throw new app_error_1.AppError('Only the program leader can remove reviewer assignments', 403, 'FORBIDDEN');
    if (assignment.status !== 'assigned') {
        throw new app_error_1.AppError('No se puede eliminar una asignación que ya fue dictaminada.', 409, 'REVIEW_ASSIGNMENT_ALREADY_COMPLETED');
    }
    const deleted = await reviewsRepository.deletePendingAssignment(id);
    if (!deleted) {
        throw new app_error_1.AppError('No se puede eliminar porque el revisor ya comenzó a trabajar en esta revisión.', 409, 'REVIEW_ASSIGNMENT_ALREADY_STARTED');
    }
    return (0, api_response_1.sendSuccess)(res, 'Reviewer assignment deleted successfully', null);
}));
exports.reviewsRouter.patch('/reviews/:id/file-comments/:commentId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('reviews.submit'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id, commentId } = review_schemas_1.reviewFileCommentParamsSchema.parse(req.params);
    const input = review_schemas_1.updateReviewFileCommentSchema.parse(req.body);
    const comment = await reviewsRepository.updateFileComment({ assignmentId: id, reviewerUserId: req.user.id, commentId, comment: input.comment });
    if (!comment)
        throw new app_error_1.AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'File comment updated successfully', comment);
}));
exports.reviewsRouter.delete('/reviews/:id/file-comments/:commentId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('reviews.submit'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id, commentId } = review_schemas_1.reviewFileCommentParamsSchema.parse(req.params);
    const deleted = await reviewsRepository.deleteFileComment({ assignmentId: id, reviewerUserId: req.user.id, commentId });
    if (!deleted)
        throw new app_error_1.AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'File comment deleted successfully');
}));
exports.reviewsRouter.get('/submissions/:id/reviews', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = review_schemas_1.reviewSubmissionParamsSchema.parse(req.params);
    const submission = await submissionsRepository.findById(id);
    if (!submission)
        throw new app_error_1.AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    const canRead = req.user.permissions.includes('submissions.manage')
        || await reviewsRepository.isProgramLeader(id, req.user.id);
    if (!canRead)
        throw new app_error_1.AppError('Only the program leader can view all reviews', 403, 'FORBIDDEN');
    const reviews = await reviewsRepository.listSubmissionReviews(id);
    return (0, api_response_1.sendSuccess)(res, 'Submission reviews retrieved successfully', reviews);
}));
exports.reviewsRouter.get('/submissions/:id/feedback', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = review_schemas_1.reviewSubmissionParamsSchema.parse(req.params);
    const feedback = await reviewsRepository.getParticipantFeedback(id, req.user.id);
    if (!feedback)
        throw new app_error_1.AppError('Review feedback is not available', 404, 'FEEDBACK_NOT_AVAILABLE');
    return (0, api_response_1.sendSuccess)(res, 'Participant review feedback retrieved successfully', feedback);
}));
exports.myReviewsRouter.get('/reviews', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('reviews.submit'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const reviews = await reviewsRepository.listMyReviews(req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'My reviews retrieved successfully', reviews);
}));
exports.reviewsRouter.get('/reviews/:id', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = review_schemas_1.reviewIdParamsSchema.parse(req.params);
    const review = await reviewsRepository.findReview(id);
    if (!review)
        throw new app_error_1.AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    if (review.reviewer_user_id !== req.user.id && !req.user.permissions.includes('reviews.read')) {
        throw new app_error_1.AppError('Permission denied', 403, 'FORBIDDEN');
    }
    return (0, api_response_1.sendSuccess)(res, 'Review retrieved successfully', review);
}));
exports.reviewsRouter.get('/reviews/:id/workspace', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('reviews.submit'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = review_schemas_1.reviewIdParamsSchema.parse(req.params);
    const workspace = await reviewsRepository.getReviewWorkspace(id, req.user.id);
    if (!workspace)
        throw new app_error_1.AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'Review workspace retrieved successfully', workspace);
}));
exports.reviewsRouter.get('/reviews/:id/audit-workspace', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = review_schemas_1.reviewIdParamsSchema.parse(req.params);
    const review = await reviewsRepository.findReview(id);
    if (!review)
        throw new app_error_1.AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    const canAudit = req.user.permissions.includes('submissions.manage')
        || await reviewsRepository.isProgramLeader(review.submission_id, req.user.id);
    if (!canAudit)
        throw new app_error_1.AppError('Only the program leader can audit this review', 403, 'FORBIDDEN');
    const workspace = await reviewsRepository.getReviewAuditWorkspace(id);
    if (!workspace)
        throw new app_error_1.AppError('Only submitted reviews can be audited', 409, 'REVIEW_NOT_SUBMITTED');
    return (0, api_response_1.sendSuccess)(res, 'Review audit workspace retrieved successfully', workspace);
}));
exports.reviewsRouter.get('/reviews/:id/audit-files/:fileId', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id, fileId } = review_schemas_1.reviewFileParamsSchema.parse(req.params);
    const review = await reviewsRepository.findReview(id);
    if (!review)
        throw new app_error_1.AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    const canAudit = req.user.permissions.includes('submissions.manage')
        || await reviewsRepository.isProgramLeader(review.submission_id, req.user.id);
    if (!canAudit)
        throw new app_error_1.AppError('Only the program leader can audit this review', 403, 'FORBIDDEN');
    const workspace = await reviewsRepository.getReviewAuditWorkspace(id);
    if (!workspace || !workspace.files.some((file) => file.id === fileId)) {
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    }
    const file = await filesRepository.findById(fileId);
    if (!file)
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    return res.sendFile(fileStorageService.getAbsolutePath(file.storagePath));
}));
exports.reviewsRouter.get('/reviews/:id/files/:fileId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('reviews.submit'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id, fileId } = review_schemas_1.reviewFileParamsSchema.parse(req.params);
    const workspace = await reviewsRepository.getReviewWorkspace(id, req.user.id);
    if (!workspace || !workspace.files.some((file) => file.id === fileId)) {
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    }
    const file = await filesRepository.findById(fileId);
    if (!file)
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    return res.sendFile(fileStorageService.getAbsolutePath(file.storagePath));
}));
exports.reviewsRouter.post('/reviews/:id/file-comments', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('reviews.submit'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = review_schemas_1.reviewIdParamsSchema.parse(req.params);
    const input = review_schemas_1.createReviewFileCommentSchema.parse(req.body);
    const comment = await reviewsRepository.addFileComment({ assignmentId: id, reviewerUserId: req.user.id, ...input });
    if (!comment)
        throw new app_error_1.AppError('File not found in this review', 404, 'FILE_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'File comment created successfully', comment, 201);
}));
exports.reviewsRouter.post('/reviews/:id/submit', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('reviews.submit'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = review_schemas_1.reviewIdParamsSchema.parse(req.params);
    const input = review_schemas_1.submitReviewSchema.parse(req.body);
    const assignedReview = await reviewsRepository.findReview(id);
    const review = await reviewsRepository.submitReview({
        assignmentId: id,
        reviewerUserId: req.user.id,
        recommendation: input.recommendation,
        comments: input.comments,
        score: input.score,
    });
    if (!review)
        throw new app_error_1.AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    if (assignedReview) {
        const leader = await reviewsRepository.findProgramLeader(assignedReview.submission_id);
        const submission = await submissionsRepository.findById(assignedReview.submission_id);
        if (leader && submission)
            await emailService.sendTemplate('review_completed', leader.email, {
                submissionTitle: submission.title,
            });
    }
    return (0, api_response_1.sendSuccess)(res, 'Review submitted successfully', review);
}));
exports.reviewsRouter.post('/submissions/:id/final-decision', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = review_schemas_1.reviewSubmissionParamsSchema.parse(req.params);
    const input = review_schemas_1.finalDecisionSchema.parse(req.body);
    const submission = await submissionsRepository.findById(id);
    if (!submission)
        throw new app_error_1.AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    const canDecide = await reviewsRepository.isProgramLeader(id, req.user.id);
    if (!canDecide)
        throw new app_error_1.AppError('Only the program leader can issue the final decision', 403, 'FORBIDDEN');
    if (!await reviewsRepository.allAssignedReviewsSubmitted(id)) {
        throw new app_error_1.AppError('All assigned reviews must be completed before issuing the final decision', 409, 'REVIEWS_PENDING');
    }
    const decision = await reviewsRepository.createDecision({
        submissionId: id,
        decision: input.decision,
        notes: input.notes,
        decidedBy: req.user.id,
    });
    const emailTemplate = input.decision === 'accepted' || input.decision === 'accepted_with_observations'
        ? 'submission_accepted'
        : input.decision === 'rejected'
            ? 'submission_rejected'
            : 'changes_requested';
    const participant = await iamRepository.findUserById(submission.ownerUserId);
    if (participant)
        await emailService.sendTemplate(emailTemplate, participant.email, { submissionTitle: submission.title });
    return (0, api_response_1.sendSuccess)(res, 'Final decision created successfully', decision, 201);
}));
//# sourceMappingURL=reviews.routes.js.map