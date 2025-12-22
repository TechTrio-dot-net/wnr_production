import { Model, Document, FilterQuery, QueryOptions, UpdateQuery } from "mongoose";

/**
 * Query optimization utilities for MongoDB Atlas
 * These helpers ensure efficient queries with proper projections and pagination
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Execute a paginated query with lean results
 * Uses lean() for better performance and proper pagination
 */
export async function paginateQuery<T extends Document>(
  model: Model<T>,
  filter: FilterQuery<T> = {},
  options: PaginationOptions = {}
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20)); // Max 100 items per page
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };

  // Execute queries in parallel for better performance
  const [data, total] = await Promise.all([
    model.find(filter).lean().sort(sort).skip(skip).limit(limit),
    model.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: data as T[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Execute a lean query (faster, returns plain objects)
 * Use when you don't need Mongoose document features
 */
export async function leanQuery<T extends Document>(
  model: Model<T>,
  filter: FilterQuery<T> = {},
  options: QueryOptions = {}
): Promise<T[]> {
  return model.find(filter).lean().exec() as Promise<T[]>;
}

/**
 * Execute a lean query with field selection
 * Only fetches specified fields for better performance
 */
export async function leanQueryWithSelect<T extends Document>(
  model: Model<T>,
  filter: FilterQuery<T> = {},
  select: string | Record<string, 0 | 1> = {},
  options: QueryOptions = {}
): Promise<T[]> {
  return model.find(filter).select(select).lean().exec() as Promise<T[]>;
}

/**
 * Find one document with lean
 */
export async function leanFindOne<T extends Document>(
  model: Model<T>,
  filter: FilterQuery<T>,
  select?: string | Record<string, 0 | 1>
): Promise<T | null> {
  const query = model.findOne(filter).lean();
  if (select) {
    query.select(select);
  }
  return query.exec() as Promise<T | null>;
}

/**
 * Update one document efficiently
 */
export async function updateOneOptimized<T extends Document>(
  model: Model<T>,
  filter: FilterQuery<T>,
  update: UpdateQuery<T>,
  options: Omit<QueryOptions, "session"> & { session?: any } = {}
): Promise<{ matchedCount: number; modifiedCount: number }> {
  const result = await model.updateOne(filter, update, {
    runValidators: true,
    ...options,
  } as any);
  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
}

/**
 * Bulk write operations (more efficient than multiple individual writes)
 */
export async function bulkWriteOptimized<T extends Document>(
  model: Model<T>,
  operations: Array<{
    updateOne?: {
      filter: FilterQuery<T>;
      update: UpdateQuery<T>;
      upsert?: boolean;
    };
    updateMany?: {
      filter: FilterQuery<T>;
      update: UpdateQuery<T>;
    };
    deleteOne?: { filter: FilterQuery<T> };
    deleteMany?: { filter: FilterQuery<T> };
    insertOne?: { document: Partial<T> };
  }>
): Promise<{ insertedCount: number; matchedCount: number; modifiedCount: number; deletedCount: number }> {
  const result = await model.bulkWrite(operations as any);
  return {
    insertedCount: result.insertedCount,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    deletedCount: result.deletedCount,
  };
}

/**
 * Aggregate query helper with pagination
 */
export async function aggregatePaginated<T>(
  model: Model<any>,
  pipeline: any[],
  options: PaginationOptions = {}
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  // Add pagination stages
  const paginationPipeline = [
    ...pipeline,
    { $sort: options.sort || { createdAt: -1 } },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await model.aggregate(paginationPipeline);
  const total = result?.total[0]?.count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: result?.data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
