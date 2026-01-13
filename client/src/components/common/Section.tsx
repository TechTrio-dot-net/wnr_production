import { PropsWithChildren } from "react";


export default function Section({ children }: PropsWithChildren) {
return <section className="container-wide py-12 md:py-16">{children}</section>;
}