import mongoSanitize from "express-mongo-sanitize";

const sanitizeMongoOperators = (value) => mongoSanitize.sanitize(value);

const keepLastPollutedValue = (value) => {
     if (Array.isArray(value)) {
          return keepLastPollutedValue(value[value.length - 1]);
     }

     if (value && typeof value === "object") {
          return Object.fromEntries(
               Object.entries(value).map(([key, nestedValue]) => [key, keepLastPollutedValue(nestedValue)])
          );
     }

     return value;
};

export const sanitizeRequest = (req, res, next) => {
     if (req.body && typeof req.body === "object") {
          req.body = sanitizeMongoOperators(req.body);
     }

     const cleanQuery = sanitizeMongoOperators(keepLastPollutedValue(req.query));

     Object.defineProperty(req, "query", {
          value: cleanQuery,
          configurable: true,
          enumerable: true,
          writable: true
     });

     next();
};
