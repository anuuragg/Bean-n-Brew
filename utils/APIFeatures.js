const AppError = require('./appError');

const FILTER_FIELDS = new Set(['name', 'brand', 'beanType', 'price', 'priceDiscount', 'weight', 'tags']);
const SORT_FIELDS = new Set(['name', 'brand', 'price', 'priceDiscount', 'weight', 'ratings.avgRating', 'createdAt']);
const FIELD_FIELDS = new Set(['name', 'brand', 'slug', 'description', 'beanType', 'price', 'priceDiscount', 'weight', 'inventory', 'media', 'ratings', 'tags', 'createdAt', 'updatedAt']);
const FILTER_OPERATORS = new Set(['gt', 'gte', 'lt', 'lte']);

class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
        this.filterQuery = {};
        this.page = 1;
        this.limit = 20;
    }

    filter() {
        const queryObj = { ...this.queryString };
        const search = queryObj.search;
        for (const key of ['page', 'sort', 'limit', 'fields', 'search']) delete queryObj[key];

        if (search !== undefined) {
            if (typeof search !== 'string' || search.trim().length < 1 || search.length > 100) {
                throw new AppError('search must be a non-empty string of at most 100 characters.', 400);
            }
            const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            this.filterQuery.$or = [
                { name: new RegExp(escaped, 'i') },
                { brand: new RegExp(escaped, 'i') },
                { description: new RegExp(escaped, 'i') },
                { tags: new RegExp(escaped, 'i') }
            ];
        }

        for (const [field, value] of Object.entries(queryObj)) {
            if (!FILTER_FIELDS.has(field)) throw new AppError(`Filtering by '${field}' is not supported.`, 400);
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (field !== 'price' && field !== 'priceDiscount' && field !== 'weight') {
                    throw new AppError(`Range filters are not supported for '${field}'.`, 400);
                }
                const conditions = {};
                for (const [operator, operand] of Object.entries(value)) {
                    if (!FILTER_OPERATORS.has(operator) || operand === '' || typeof operand === 'object') {
                        throw new AppError(`Invalid filter operator for '${field}'.`, 400);
                    }
                    conditions[`$${operator}`] = operand;
                }
                this.filterQuery[field] = conditions;
            } else {
                this.filterQuery[field] = value;
            }
        }

        this.query = this.query.find(this.filterQuery);
        return this;
    }

    sort() {
        if (!this.queryString.sort) {
            this.query = this.query.sort('-createdAt');
            return this;
        }
        if (typeof this.queryString.sort !== 'string') throw new AppError('sort must be a comma-separated string.', 400);

        const fields = this.queryString.sort.split(',').map(field => field.trim());
        if (fields.some(field => !SORT_FIELDS.has(field.replace(/^-/, '')))) {
            throw new AppError('One or more sort fields are not supported.', 400);
        }
        this.query = this.query.sort(fields.join(' '));
        return this;
    }

    limitFields() {
        if (!this.queryString.fields) {
            this.query = this.query.select('-__v');
            return this;
        }
        if (typeof this.queryString.fields !== 'string') throw new AppError('fields must be a comma-separated string.', 400);

        const fields = this.queryString.fields.split(',').map(field => field.trim());
        if (fields.some(field => !FIELD_FIELDS.has(field.replace(/^-/, '')))) {
            throw new AppError('One or more requested fields are not supported.', 400);
        }
        this.query = this.query.select(fields.join(' '));
        return this;
    }

    paginate() {
        this.page = Number(this.queryString.page || 1);
        this.limit = Number(this.queryString.limit || 20);
        if (!Number.isInteger(this.page) || this.page < 1 || !Number.isInteger(this.limit) || this.limit < 1) {
            throw new AppError('page and limit must be positive integers.', 400);
        }
        this.limit = Math.min(this.limit, 100);
        this.query = this.query.skip((this.page - 1) * this.limit).limit(this.limit);
        return this;
    }
}

module.exports = APIFeatures;
