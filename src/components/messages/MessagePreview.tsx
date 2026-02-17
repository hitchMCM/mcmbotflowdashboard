import { useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Phone, Play, AlertTriangle, Link, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageContent, MessageButton, TemplateElement, QuickReply, ImageFullContent } from "@/types/messages";
import { FB_LIMITS } from "./MessageEditor";

interface MessagePreviewProps {
  content: MessageContent;
  className?: string;
}

// Truncate text with ellipsis if over limit
const truncate = (text: string | undefined, limit: number): string => {
  if (!text) return "";
  if (text.length <= limit) return text;
  return text.substring(0, limit - 1) + "…";
};

// Check if text exceeds limit
const isOverLimit = (text: string | undefined, limit: number): boolean => {
  return (text?.length || 0) > limit;
};

export function MessagePreview({ content, className }: MessagePreviewProps) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  const { message_type } = content;

  // Check if image URL has issues
  const checkImageUrl = (url: string | undefined): { valid: boolean; warning?: string } => {
    if (!url) return { valid: false };
    if (!url.startsWith('https://')) {
      return { valid: false, warning: 'URL must start with https://' };
    }
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return { valid: false, warning: 'Local URLs won\'t work on Facebook' };
    }
    return { valid: true };
  };

  const handleImageError = (imageUrl: string) => {
    setImageErrors(prev => ({ ...prev, [imageUrl]: true }));
  };

  // Render a button
  const renderButton = (btn: MessageButton, idx: number) => {
    const titleOver = isOverLimit(btn.title, FB_LIMITS.BUTTON_TITLE);
    return (
      <div 
        key={idx}
        className={cn(
          "py-3 px-4 text-center text-sm font-medium text-primary border-b last:border-b-0 hover:bg-primary/5 cursor-pointer flex items-center justify-center gap-2",
          titleOver && "text-destructive"
        )}
        title={titleOver ? `Titre trop long (${btn.title?.length}/${FB_LIMITS.BUTTON_TITLE})` : undefined}
      >
        {btn.type === 'web_url' && <ExternalLink className="h-3 w-3" />}
        {btn.type === 'phone_number' && <Phone className="h-3 w-3" />}
        {titleOver && <AlertTriangle className="h-3 w-3" />}
        {truncate(btn.title, FB_LIMITS.BUTTON_TITLE)}
      </div>
    );
  };

  // Render a generic card element
  const renderCard = (element: TemplateElement, showNavigation = false) => {
    const titleOver = isOverLimit(element.title, FB_LIMITS.TITLE);
    const subtitleOver = isOverLimit(element.subtitle, FB_LIMITS.SUBTITLE);
    const buttonsOver = (element.buttons?.length || 0) > FB_LIMITS.MAX_BUTTONS;
    const imageCheck = checkImageUrl(element.image_url);
    const hasImageError = element.image_url ? imageErrors[element.image_url] : false;
    
    return (
      <div className="bg-muted rounded-2xl overflow-hidden shadow-lg">
        {element.image_url && (
          <div 
            className={cn(
              "h-40 bg-gray-200 relative overflow-hidden",
              element.default_action?.url && "cursor-pointer"
            )}
            title={element.default_action?.url ? `Cliquable: ${element.default_action.url}` : undefined}
          >
            {/* Show warning for invalid URLs */}
            {(!imageCheck.valid || hasImageError) ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-gray-300">
                <ImageOff className="h-8 w-8 mb-2" />
                <span className="text-xs text-center px-4">
                  {imageCheck.warning || (hasImageError ? "Image failed to load" : "Invalid image URL")}
                </span>
              </div>
            ) : (
              <img 
                src={element.image_url} 
                alt={element.title || "Card image"}
                className="w-full h-full object-contain bg-gray-100"
                onError={() => handleImageError(element.image_url!)}
              />
            )}
            {/* Clickable image indicator */}
            {element.default_action?.url && (
              <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <Link className="h-3 w-3" />
                Cliquable
              </div>
            )}
            {showNavigation && (content.elements?.length || 0) > 1 && (
              <>
                <button
                  onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                  disabled={carouselIndex === 0}
                  title="Previous card"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 hover:bg-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCarouselIndex(Math.min((content.elements?.length || 1) - 1, carouselIndex + 1))}
                  disabled={carouselIndex >= (content.elements?.length || 1) - 1}
                  title="Next card"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 hover:bg-white disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
        <div className="p-4">
          {element.title && (
            <h4 
              className={cn("font-semibold text-lg", titleOver && "text-destructive")}
              title={titleOver ? `Titre trop long (${element.title?.length}/${FB_LIMITS.TITLE})` : undefined}
            >
              {titleOver && <AlertTriangle className="h-4 w-4 inline mr-1" />}
              {truncate(element.title, FB_LIMITS.TITLE)}
            </h4>
          )}
          {element.subtitle && (
            <p 
              className={cn("text-sm text-muted-foreground mt-1 whitespace-pre-line", subtitleOver && "text-destructive")}
              title={subtitleOver ? `Sous-titre trop long (${element.subtitle?.length}/${FB_LIMITS.SUBTITLE})` : undefined}
            >
              {subtitleOver && <AlertTriangle className="h-3 w-3 inline mr-1" />}
              {truncate(element.subtitle, FB_LIMITS.SUBTITLE)}
            </p>
          )}
        </div>
        {element.buttons && element.buttons.length > 0 && (
          <div className={cn("border-t", buttonsOver && "border-destructive")}>
            {element.buttons.slice(0, FB_LIMITS.MAX_BUTTONS).map((btn, i) => renderButton(btn, i))}
            {buttonsOver && (
              <div className="py-2 px-4 text-xs text-destructive text-center bg-destructive/10">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                +{element.buttons.length - FB_LIMITS.MAX_BUTTONS} bouton(s) ignoré(s)
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render quick replies
  const renderQuickReplies = (quickReplies: QuickReply[]) => {
    const qrOver = quickReplies.length > FB_LIMITS.MAX_QUICK_REPLIES;
    const displayReplies = quickReplies.slice(0, FB_LIMITS.MAX_QUICK_REPLIES);
    
    return (
      <div className="mt-3">
        <div className="flex flex-wrap gap-2 justify-center">
          {displayReplies.map((qr, idx) => {
            const titleOver = isOverLimit(qr.title, FB_LIMITS.QUICK_REPLY_TITLE);
            return (
              <button
                key={idx}
                className={cn(
                  "px-4 py-2 bg-white border rounded-full text-sm font-medium transition-colors flex items-center gap-2",
                  titleOver ? "border-destructive text-destructive" : "border-primary text-primary hover:bg-primary/5"
                )}
                title={titleOver ? `Titre trop long (${qr.title?.length}/${FB_LIMITS.QUICK_REPLY_TITLE})` : undefined}
              >
                {qr.image_url && (
                  <img src={qr.image_url} alt="" className="w-5 h-5 rounded-full" />
                )}
                {titleOver && <AlertTriangle className="h-3 w-3" />}
                {truncate(qr.title, FB_LIMITS.QUICK_REPLY_TITLE)}
              </button>
            );
          })}
        </div>
        {qrOver && (
          <p className="text-xs text-destructive text-center mt-2">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            +{quickReplies.length - FB_LIMITS.MAX_QUICK_REPLIES} quick reply(s) ignoré(s)
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={cn("max-w-sm mx-auto", className)}>
      {/* Text Message */}
      {message_type === 'text' && (
        <div>
          <div className="bg-muted rounded-2xl p-4 shadow-lg">
            {isOverLimit(content.text, FB_LIMITS.TEXT_MESSAGE) && (
              <p className="text-xs text-destructive mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Message trop long ({content.text?.length}/{FB_LIMITS.TEXT_MESSAGE})
              </p>
            )}
            <p className={cn(
              "whitespace-pre-line",
              isOverLimit(content.text, FB_LIMITS.TEXT_MESSAGE) && "text-destructive"
            )}>
              {truncate(content.text, FB_LIMITS.TEXT_MESSAGE)}
            </p>
          </div>
          {content.quick_replies && content.quick_replies.length > 0 && 
            renderQuickReplies(content.quick_replies)
          }
        </div>
      )}

      {/* Generic Template (Single Card) */}
      {message_type === 'generic' && content.elements?.[0] && (
        <div>
          {renderCard(content.elements[0])}
          {content.quick_replies && content.quick_replies.length > 0 && 
            renderQuickReplies(content.quick_replies)
          }
        </div>
      )}

      {/* Button Template */}
      {message_type === 'button' && content.elements?.[0] && (() => {
        const textOver = isOverLimit(content.elements[0].title, FB_LIMITS.BUTTON_TEMPLATE_TEXT);
        const buttonsOver = (content.elements[0].buttons?.length || 0) > FB_LIMITS.MAX_BUTTONS;
        return (
          <div>
            <div className="bg-muted rounded-2xl overflow-hidden shadow-lg">
              <div className="p-4">
                {textOver && (
                  <p className="text-xs text-destructive mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Texte trop long ({content.elements![0].title?.length}/{FB_LIMITS.BUTTON_TEMPLATE_TEXT})
                  </p>
                )}
                <p className={cn(
                  "whitespace-pre-line",
                  textOver && "text-destructive"
                )}>
                  {truncate(content.elements![0].title, FB_LIMITS.BUTTON_TEMPLATE_TEXT) || "Your message with buttons..."}
                </p>
              </div>
              {content.elements[0].buttons && content.elements[0].buttons.length > 0 && (
                <div className={cn("border-t", buttonsOver && "border-destructive")}>
                  {content.elements[0].buttons.slice(0, FB_LIMITS.MAX_BUTTONS).map((btn, i) => renderButton(btn, i))}
                  {buttonsOver && (
                    <div className="py-2 px-4 text-xs text-destructive text-center bg-destructive/10">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      +{content.elements![0].buttons!.length - FB_LIMITS.MAX_BUTTONS} bouton(s) ignoré(s)
                    </div>
                  )}
                </div>
              )}
            </div>
            {content.quick_replies && content.quick_replies.length > 0 && 
              renderQuickReplies(content.quick_replies)
            }
          </div>
        );
      })()}

      {/* Media Template */}
      {message_type === 'media' && content.media_element && (
        <div>
          <div className="bg-muted rounded-2xl overflow-hidden shadow-lg">
            {content.media_element.media_type === 'image' ? (
              <div 
                className="h-48 bg-cover bg-center bg-gray-300"
                style={{ backgroundImage: content.media_element.url ? `url(${content.media_element.url})` : undefined }}
              >
                {!content.media_element.url && (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Image
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 bg-gray-900 flex items-center justify-center relative">
                {content.media_element.url ? (
                  <video 
                    src={content.media_element.url} 
                    className="max-h-full max-w-full"
                    controls={false}
                  />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/80 rounded-full p-3">
                    <Play className="h-6 w-6 text-gray-900" />
                  </div>
                </div>
              </div>
            )}
            {content.media_element.buttons && content.media_element.buttons.length > 0 && (
              <div className="border-t">
                {content.media_element.buttons.map((btn, i) => renderButton(btn, i))}
              </div>
            )}
          </div>
          {content.quick_replies && content.quick_replies.length > 0 && 
            renderQuickReplies(content.quick_replies)
          }
        </div>
      )}

      {/* Carousel */}
      {message_type === 'carousel' && content.elements && content.elements.length > 0 && (() => {
        const cardsOver = content.elements.length > FB_LIMITS.MAX_CAROUSEL_ELEMENTS;
        const displayElements = content.elements.slice(0, FB_LIMITS.MAX_CAROUSEL_ELEMENTS);
        return (
          <div>
            {cardsOver && (
              <p className="text-xs text-destructive mb-2 flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Trop de cartes ({content.elements.length}/{FB_LIMITS.MAX_CAROUSEL_ELEMENTS}) - certaines seront ignorées
              </p>
            )}
            <div className="relative">
            {/* Carousel Navigation */}
            {displayElements.length > 1 && (
              <div className="absolute -left-10 -right-10 top-1/2 -translate-y-1/2 flex justify-between z-10 pointer-events-none">
                <button
                  onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                  disabled={carouselIndex === 0}
                  title="Previous card"
                  className="bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 disabled:opacity-30 pointer-events-auto"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCarouselIndex(Math.min(displayElements.length - 1, carouselIndex + 1))}
                  disabled={carouselIndex >= displayElements.length - 1}
                  title="Next card"
                  className="bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 disabled:opacity-30 pointer-events-auto"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
            
            {/* Cards Container */}
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-300 ease-in-out gap-2"
                style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
              >
                {displayElements.map((element, idx) => (
                  <div key={idx} className="flex-shrink-0 w-full">
                    {renderCard(element)}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Dots */}
            {displayElements.length > 1 && (
              <div className="flex justify-center gap-1 mt-3">
                {displayElements.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    title={`Go to card ${idx + 1}`}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      idx === carouselIndex ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
          {content.quick_replies && content.quick_replies.length > 0 && 
            renderQuickReplies(content.quick_replies)
          }
        </div>
        );
      })()}

      {/* Quick Replies (standalone) */}
      {message_type === 'quick_replies' && (
        <div>
          <div className="bg-muted rounded-2xl p-4 shadow-lg">
            {isOverLimit(content.text, FB_LIMITS.TEXT_MESSAGE) && (
              <p className="text-xs text-destructive mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Message trop long ({content.text?.length}/{FB_LIMITS.TEXT_MESSAGE})
              </p>
            )}
            <p className={cn(
              "whitespace-pre-line",
              isOverLimit(content.text, FB_LIMITS.TEXT_MESSAGE) && "text-destructive"
            )}>
              {truncate(content.text, FB_LIMITS.TEXT_MESSAGE) || "Choose an option:"}
            </p>
          </div>
          {content.quick_replies && content.quick_replies.length > 0 && 
            renderQuickReplies(content.quick_replies)
          }
        </div>
      )}

      {/* Image Full - Full image + text + buttons (2 messages preview) */}
      {message_type === 'image_full' && content.image_full && (() => {
        const imageCheck = checkImageUrl(content.image_full.image_url);
        const hasImageError = content.image_full.image_url ? imageErrors[content.image_full.image_url] : false;
        const textOver = isOverLimit(content.image_full.text, FB_LIMITS.BUTTON_TEMPLATE_TEXT);
        const buttonsOver = (content.image_full.buttons?.length || 0) > FB_LIMITS.MAX_BUTTONS;
        
        return (
          <div className="space-y-2">
            {/* Message 1: Full Image */}
            <div className="bg-muted rounded-2xl overflow-hidden shadow-lg">
              <div className="relative">
                {content.image_full.image_url && (!imageCheck.valid || hasImageError) ? (
                  <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-gray-300">
                    <ImageOff className="h-8 w-8 mb-2" />
                    <span className="text-xs text-center px-4">
                      {imageCheck.warning || (hasImageError ? "Image failed to load" : "Invalid image URL")}
                    </span>
                  </div>
                ) : content.image_full.image_url ? (
                  <img 
                    src={content.image_full.image_url} 
                    alt="Full image"
                    className="w-full max-h-80 object-contain bg-gray-100"
                    onError={() => handleImageError(content.image_full!.image_url)}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground bg-gray-200">
                    <div className="text-center">
                      <ImageOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Image complète (9:16, portrait)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Separator showing 2 messages */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
              <div className="flex-1 h-px bg-border"></div>
              <span>Message suivant</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* Message 2: Text + Buttons */}
            <div className="bg-muted rounded-2xl overflow-hidden shadow-lg">
              <div className="p-4">
                {textOver && (
                  <p className="text-xs text-destructive mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Texte trop long ({content.image_full.text?.length}/{FB_LIMITS.BUTTON_TEMPLATE_TEXT})
                  </p>
                )}
                <p className={cn(
                  "whitespace-pre-line",
                  textOver && "text-destructive"
                )}>
                  {truncate(content.image_full.text, FB_LIMITS.BUTTON_TEMPLATE_TEXT) || "Votre texte ici..."}
                </p>
              </div>
              {content.image_full.buttons && content.image_full.buttons.length > 0 && (
                <div className={cn("border-t", buttonsOver && "border-destructive")}>
                  {content.image_full.buttons.slice(0, FB_LIMITS.MAX_BUTTONS).map((btn, i) => renderButton(btn, i))}
                  {buttonsOver && (
                    <div className="py-2 px-4 text-xs text-destructive text-center bg-destructive/10">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      +{content.image_full.buttons.length - FB_LIMITS.MAX_BUTTONS} bouton(s) ignoré(s)
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {content.quick_replies && content.quick_replies.length > 0 && 
              renderQuickReplies(content.quick_replies)
            }
          </div>
        );
      })()}

      {/* Opt-in (one_time_notif_req) */}
      {message_type === 'opt_in' && content.opt_in && (() => {
        const textOver = isOverLimit(content.opt_in.title, FB_LIMITS.BUTTON_TEMPLATE_TEXT);
        
        return (
          <div className="space-y-2">
            <div className="bg-muted rounded-2xl overflow-hidden shadow-lg">
              {/* Title */}
              <div className="p-4">
                {textOver && (
                  <p className="text-xs text-destructive mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Texte trop long ({content.opt_in.title?.length}/{FB_LIMITS.BUTTON_TEMPLATE_TEXT})
                  </p>
                )}
                <p className={cn(
                  "whitespace-pre-line",
                  textOver && "text-destructive"
                )}>
                  {truncate(content.opt_in.title, FB_LIMITS.BUTTON_TEMPLATE_TEXT) || "Souhaitez-vous recevoir nos mises à jour ?"}
                </p>
              </div>

              {/* Facebook auto-generated opt-in button */}
              <div className="border-t">
                <div className="py-3 px-4 text-center text-sm font-medium text-primary border-b hover:bg-primary/5 cursor-pointer flex items-center justify-center gap-2">
                  🔔 Recevoir le message
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center px-2">
              Le bouton "Recevoir le message" est généré automatiquement par Facebook
            </p>
          </div>
        );
      })()}
    </div>
  );
}

export default MessagePreview;
