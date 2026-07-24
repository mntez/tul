import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <section className="screen-auth active">
      <SignUp />
    </section>
  );
}