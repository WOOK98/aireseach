import { MDXContent } from "@content-collections/mdx/react";

interface MdxProps {
  readonly mdx: string;
}

export const Mdx = ({ mdx }: MdxProps) => {
  return (
    <div className="prose dark:prose-invert prose-headings:font-semibold prose-pre:max-w-full w-full py-6">
      <MDXContent code={mdx} />
    </div>
  );
};
