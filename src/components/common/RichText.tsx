/**
 * @file src/components/common/RichText.tsx
 * @description Renderiza o texto das questões vindo das APIs: exibe imagens (em vez do link),
 * itálico/negrito reais, quebras de parágrafo e margem justificada.
 */

import React, { useState } from 'react';
import { parseRichText } from '../../utils/richText.ts';
import type { InlineNode } from '../../utils/richText.ts';

interface RichImageProps {
  src: string;
  alt: string;
  className?: string;
}

const RichImage: React.FC<RichImageProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-bold underline text-blue-700 break-all"
      >
        Imagem indisponível (abrir link)
      </a>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`block mx-auto my-2 max-w-full h-auto ${className}`}
    />
  );
};

function renderInline(nodes: InlineNode[], imgClassName?: string): React.ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return <React.Fragment key={index}>{node.value}</React.Fragment>;
      case 'bold':
        return <strong key={index}>{renderInline(node.children, imgClassName)}</strong>;
      case 'italic':
        return <em key={index}>{renderInline(node.children, imgClassName)}</em>;
      case 'underline':
        return <u key={index}>{renderInline(node.children, imgClassName)}</u>;
      case 'sup':
        return <sup key={index}>{renderInline(node.children, imgClassName)}</sup>;
      case 'sub':
        return <sub key={index}>{renderInline(node.children, imgClassName)}</sub>;
      case 'image':
        return <RichImage key={`${index}-${node.src}`} src={node.src} alt={node.alt} className={imgClassName} />;
      case 'link':
        return (
          <a
            key={index}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-700 break-all"
          >
            {renderInline(node.children, imgClassName)}
          </a>
        );
      default:
        return null;
    }
  });
}

interface RichTextProps {
  text?: string | null;
  /** Use 'span' quando o texto estiver dentro de elementos que só aceitam conteúdo inline (ex.: button). */
  as?: 'div' | 'span';
  className?: string;
  imgClassName?: string;
}

const JUSTIFIED_STYLE: React.CSSProperties = {
  textAlign: 'justify',
  hyphens: 'auto',
  overflowWrap: 'break-word',
};

export const RichText: React.FC<RichTextProps> = ({ text, as = 'div', className = '', imgClassName }) => {
  const paragraphs = parseRichText(text);
  const Wrapper = as;
  const ParagraphTag = as === 'span' ? 'span' : 'p';

  return (
    <Wrapper className={className} style={JUSTIFIED_STYLE}>
      {paragraphs.map((paragraph, index) => (
        <ParagraphTag key={index} className={`block ${index > 0 ? 'mt-3' : ''}`}>
          {renderInline(paragraph, imgClassName)}
        </ParagraphTag>
      ))}
    </Wrapper>
  );
};