import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      orgId: string;
      role: string;
    };
  }

  interface User {
    orgId: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    orgId: string;
    role: string;
  }
}
