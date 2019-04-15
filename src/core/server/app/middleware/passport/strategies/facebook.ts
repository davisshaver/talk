import { Profile, Strategy } from "passport-facebook";

import OAuth2Strategy, {
  OAuth2StrategyOptions,
} from "talk-server/app/middleware/passport/strategies/oauth2";
import { constructTenantURL } from "talk-server/app/url";
import {
  GQLAuthIntegrations,
  GQLFacebookAuthIntegration,
  GQLUSER_ROLE,
} from "talk-server/graph/tenant/schema/__generated__/types";
import { Tenant } from "talk-server/models/tenant";
import {
  FacebookProfile,
  retrieveUserWithProfile,
} from "talk-server/models/user";
import { insert } from "talk-server/services/users";

export type FacebookStrategyOptions = OAuth2StrategyOptions;

export default class FacebookStrategy extends OAuth2Strategy<
  GQLFacebookAuthIntegration,
  Strategy
> {
  public name = "facebook";

  constructor(options: FacebookStrategyOptions) {
    super({
      ...options,
      authenticateOptions: {
        display: "popup",
        scope: ["email"],
      },
    });
  }

  protected getIntegration = (integrations: GQLAuthIntegrations) =>
    integrations.facebook;

  protected async findOrCreateUser(
    tenant: Tenant,
    integration: Required<GQLFacebookAuthIntegration>,
    { id, photos, emails, displayName }: Profile
  ) {
    // Create the user profile that will be used to lookup the User.
    const profile: FacebookProfile = {
      type: "facebook",
      id,
    };

    let user = await retrieveUserWithProfile(this.mongo, tenant.id, profile);
    if (!user) {
      if (!integration.allowRegistration) {
        // Registration is disabled, so we can't create the user user here.
        return;
      }

      // FIXME: implement rules.

      // Try to get the avatar.
      let avatar: string | undefined;
      if (photos && photos.length > 0) {
        avatar = photos[0].value;
      }

      // Try to get the email address.
      let email: string | undefined;
      let emailVerified: boolean | undefined;
      if (emails && emails.length > 0) {
        email = emails[0].value;
        emailVerified = false;
      }

      user = await insert(this.mongo, tenant, {
        username: displayName,
        role: GQLUSER_ROLE.COMMENTER,
        email,
        emailVerified,
        avatar,
        profiles: [profile],
      });
    }

    // TODO: maybe update user details?

    return user;
  }

  protected createStrategy(
    tenant: Tenant,
    integration: Required<GQLFacebookAuthIntegration>
  ) {
    return new Strategy(
      {
        clientID: integration.clientID,
        clientSecret: integration.clientSecret,
        callbackURL: constructTenantURL(
          this.config,
          tenant,
          "/api/auth/facebook/callback"
        ),
        profileFields: ["id", "displayName", "photos", "email"],
        enableProof: true,
        passReqToCallback: true,
      },
      this.verifyCallback
    );
  }
}