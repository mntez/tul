import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <section className="screen-auth active">
      <SignIn />
    </section>
  );
}