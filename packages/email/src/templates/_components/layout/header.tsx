import { Img } from "react-email";

interface HeaderProps {
  readonly origin: string;
}

export const Header = ({ origin }: HeaderProps) => {
  return (
    <Img
      src={`${origin}/images/logo-text.png`}
      alt="Turbostarter Logo"
      className="mb-10"
      height={45}
    />
  );
};
