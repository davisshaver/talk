const UsersService = require('../../../services/users');
const UserModel = require('../../../models/user');

module.exports = {
  tokenUserNotFound: async ({ jwt }) => {
    let emailUser = await UserModel.findOne({'email': jwt.email});
    if (emailUser) {
      return emailUser;
    }
    let profileUser = await UserModel.findOne({
      profiles: {
        $elemMatch: {
          id: jwt.email,
          provider: 'local'
        }
      }
    });
    if (profileUser) {
      return profileUser;
    }
    const username = await UsersService.getInitialUsername(jwt.un);
    let user = await UserModel.findOneAndUpdate(
      {
        id: jwt.sub,
      },
      {
        id: jwt.sub,
        email: jwt.email,
        username,
        lowercaseUsername: username.toLowerCase(),
        roles: [],
        profiles: [
          {
            provider: 'WordPress',
            id: jwt.sub,
            username: jwt.un,
          },
          {
            provider: 'local',
            id: jwt.email,
            username: jwt.un,
          },
        ],  
        provider: 'local',
        status: {
          username: {
            status: 'SET',
            history: [
              {
                status: 'SET',
              },
            ],
          },
        },
        displayName: jwt.un,
      },
      {
        setDefaultsOnInsert: true,
        new: true,
        upsert: true,
      }
    );
    if (!user) {
      return null;
    }
    return user;
  },
};
