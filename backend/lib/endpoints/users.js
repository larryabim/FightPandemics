const Auth0 = require("../components/Auth0");
const { getBearerToken } = require("../utils");
const { getUserByIdSchema, createUserSchema } = require("./schema/users");

/*
 * /api/users
 */
async function routes(app) {
  const User = app.mongo.model("IndividualUser");

  app.get("/current", { preValidation: [app.authenticate] }, async (req) => {
    const result = await User.findById(req.userId);
    if (result === null) {
      throw app.httpErrors.notFound();
    }
    const {
      _id: id,
      about,
      email,
      firstName,
      lastName,
      location,
      needs,
      objectives,
      urls,
    } = result;
    return {
      about,
      email,
      firstName,
      id,
      lastName,
      location,
      needs,
      objectives,
      urls,
    };
  });

  app.get(
    "/:userId",
    { preValidation: [app.authenticate], schema: getUserByIdSchema },
    async (req) => {
      const user = await User.findById(req.params.userId);
      if (user === null) {
        throw app.httpErrors.notFound();
      }
      const { firstName, lastName, _id: id } = user;
      return {
        firstName,
        id,
        lastName,
      };
    },
  );

  app.post(
    "/",
    { preValidation: [app.authenticate], schema: createUserSchema },
    async (req) => {
      const user = await Auth0.getUser(getBearerToken(req));
      const { email, email_verified: emailVerified } = user;
      if (!emailVerified) {
        throw app.httpErrors.forbidden("Email address not verified");
      }
      if (!req.userId) {
        req.log.error(`No userId for create user ${email}, invalid configuration`);
        throw app.httpErrors.internalServerError();
      }
      if (await User.findById(req.userId)) {
        throw app.httpErrors.conflict("User exists");
      }
      const userData = {
        ...req.body,
        _id: req.userId,
        authId: req.user.sub,
        email,
      };
      return new User(userData).save();
    },
  );
}

module.exports = routes;
