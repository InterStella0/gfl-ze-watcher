'use client'

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Guide, GuideCategory, GuideCategoryType, CreateGuideDto, UpdateGuideDto } from 'types/guides';
import { Card } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Textarea } from 'components/ui/textarea';
import { Label } from 'components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from 'components/ui/select';
import { toast } from 'sonner';
import {
    Heading1,
    Heading2,
    Heading3,
    Bold,
    Italic,
    List,
    ListOrdered,
    Link as LinkIcon,
    Image as ImageIcon,
    Youtube,
    Code
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from 'components/ui/alert-dialog';
import { useMapContext } from '../../../app/servers/[server_slug]/maps/[map_name]/MapContext';
import { useServerData } from '../../../app/servers/[server_slug]/ServerDataProvider';
import { fetchApiServerUrl } from 'utils/generalUtils';

// Configure sanitize schema to allow all necessary tags
const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [
        ...(defaultSchema.tagNames || []),
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', // Ensure headings are allowed
        'iframe' // For YouTube embeds
    ],
    attributes: {
        ...defaultSchema.attributes,
        iframe: ['src', 'title', 'allow', 'allowFullScreen', 'className', 'style']
    }
};

interface GuideEditorProps {
    mode: 'create' | 'edit';
    initialGuide?: Guide;
}

export default function GuideEditor({ mode, initialGuide }: GuideEditorProps) {
    const { name: mapName } = useMapContext();
    const { server } = useServerData();
    const router = useRouter();

    const [title, setTitle] = useState(initialGuide?.title || '');
    const [content, setContent] = useState(initialGuide?.content || '');
    const [category, setCategory] = useState<GuideCategoryType | null>(
        initialGuide?.category || GuideCategory.GENERAL
    );
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Dialog state for markdown insertion
    type MarkdownType = 'heading1' | 'heading2' | 'heading3' | 'bold' | 'italic' | 'list' | 'ordered-list' | 'link' | 'image' | 'youtube' | 'code-inline' | 'code-block';
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<MarkdownType | null>(null);
    const [dialogInputs, setDialogInputs] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!title.trim()) {
            newErrors.title = 'Title is required';
        } else if (title.length < 5) {
            newErrors.title = 'Title must be at least 5 characters';
        } else if (title.length > 200) {
            newErrors.title = 'Title must be at most 200 characters';
        }

        if (!content.trim()) {
            newErrors.content = 'Content is required';
        } else if (content.length < 50) {
            newErrors.content = 'Content must be at least 50 characters';
        }

        if (!category) {
            newErrors.category = 'Category is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const insertMarkdown = (markdown: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = content.substring(0, start);
        const after = content.substring(end);

        const newContent = before + markdown + after;
        setContent(newContent);

        // Set cursor position after inserted text
        setTimeout(() => {
            textarea.focus();
            const newPosition = start + markdown.length;
            textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
    };

    const openMarkdownDialog = (type: MarkdownType) => {
        setDialogType(type);
        setDialogInputs({});
        setDialogOpen(true);
    };

    const handleDialogSubmit = () => {
        if (!dialogType) return;

        let markdown = '';

        switch (dialogType) {
            case 'heading1':
                markdown = `# ${dialogInputs.text || ''}\n\n`;
                break;
            case 'heading2':
                markdown = `## ${dialogInputs.text || ''}\n\n`;
                break;
            case 'heading3':
                markdown = `### ${dialogInputs.text || ''}\n\n`;
                break;
            case 'bold':
                markdown = `**${dialogInputs.text || ''}**`;
                break;
            case 'italic':
                markdown = `*${dialogInputs.text || ''}*`;
                break;
            case 'list':
            case 'ordered-list': {
                const items = (dialogInputs.items || '').split(',').map(item => item.trim()).filter(Boolean);
                markdown = items
                    .map((item, index) =>
                        dialogType === 'ordered-list' ? `${index + 1}. ${item}` : `- ${item}`
                    )
                    .join('\n');
                if (markdown) markdown = `\n${markdown}\n\n`;
                break;
            }
            case 'link':
                markdown = `[${dialogInputs.text || ''}](${dialogInputs.url || ''})`;
                break;
            case 'image':
                markdown = `![${dialogInputs.alt || ''}](${dialogInputs.url || ''})`;
                break;
            case 'youtube':
                markdown = `[${dialogInputs.description || 'YouTube video'}](${dialogInputs.url || ''})`;
                break;
            case 'code-inline':
                markdown = `\`${dialogInputs.code || ''}\``;
                break;
            case 'code-block':
                markdown = `\n\`\`\`${dialogInputs.language || ''}\n${dialogInputs.code || ''}\n\`\`\`\n\n`;
                break;
        }

        insertMarkdown(markdown);
        setDialogOpen(false);
        setDialogInputs({});
    };

    const handleSubmit = async () => {
        if (!validate()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        setSubmitting(true);
        try {
            const body = mode === 'create'
                ? { title, content, category } as CreateGuideDto
                : { title, content, category } as UpdateGuideDto;

            const endpoint = mode === 'create'
                ? `/maps/${mapName}/guides`
                : `/maps/${mapName}/guides/${initialGuide?.id}`;

            const method = mode === 'create' ? 'POST' : 'PUT';

            const data = await fetchApiServerUrl(server.id, endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            toast.success(
                mode === 'create' ? 'Guide created successfully!' : 'Guide updated successfully!'
            );
            // Navigate to the guide detail page
            const guideSlug = data.slug;
            router.refresh(); // Force refresh to invalidate cache
            router.push(`/servers/${server.gotoLink}/maps/${mapName}/guides/${guideSlug}`)
        } catch (error: any) {
            toast.error(`Failed to ${mode} guide`, {
                description: error.message
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (mode === 'edit' && initialGuide) {
            router.push(`/servers/${server.gotoLink}/maps/${mapName}/guides/${initialGuide.slug}`);
        } else {
            router.push(`/servers/${server.gotoLink}/maps/${mapName}/guides`);
        }
    };

    return (
        <div className="space-y-6">
            {/* Title Field */}
            <div className="space-y-2">
                <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a clear, descriptive title for your guide"
                    maxLength={200}
                    className={errors.title ? 'border-destructive' : ''}
                />
                <div className="flex justify-between text-xs">
                    {errors.title ? (
                        <span className="text-destructive">{errors.title}</span>
                    ) : (
                        <span className="text-muted-foreground">
                            A clear title helps others find your guide
                        </span>
                    )}
                    <span className="text-muted-foreground">{title.length}/200</span>
                </div>
            </div>

            {/* Category Field */}
            <div className="space-y-2">
                <Label htmlFor="category">
                    Category <span className="text-destructive">*</span>
                </Label>
                <Select value={category} onValueChange={(value) => setCategory(value as GuideCategoryType)}>
                    <SelectTrigger id="category" className={errors.category ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(GuideCategory).map(([key, label]) => (
                            <SelectItem key={key} value={label}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.category && (
                    <span className="text-xs text-destructive">{errors.category}</span>
                )}
            </div>

            {/* Content Field with Tabs */}
            <div className="space-y-2">
                <Label htmlFor="content">
                    Content <span className="text-destructive">*</span>
                </Label>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="edit">Edit</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit" className="space-y-2">
                        {/* Markdown Toolbar */}
                        <Card className="p-2">
                            <div className="flex flex-wrap gap-1">
                                {/* Headings */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('heading1')}
                                    title="Insert H1 Heading"
                                >
                                    <Heading1 className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('heading2')}
                                    title="Insert H2 Heading"
                                >
                                    <Heading2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('heading3')}
                                    title="Insert H3 Heading"
                                >
                                    <Heading3 className="h-4 w-4" />
                                </Button>

                                <div className="w-px h-8 bg-border mx-1" />

                                {/* Text Formatting */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('bold')}
                                    title="Insert Bold Text"
                                >
                                    <Bold className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('italic')}
                                    title="Insert Italic Text"
                                >
                                    <Italic className="h-4 w-4" />
                                </Button>

                                <div className="w-px h-8 bg-border mx-1" />

                                {/* Lists */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('list')}
                                    title="Insert Unordered List"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('ordered-list')}
                                    title="Insert Ordered List"
                                >
                                    <ListOrdered className="h-4 w-4" />
                                </Button>

                                <div className="w-px h-8 bg-border mx-1" />

                                {/* Media */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('link')}
                                    title="Insert Link"
                                >
                                    <LinkIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('image')}
                                    title="Insert Image"
                                >
                                    <ImageIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('youtube')}
                                    title="Insert YouTube Video"
                                >
                                    <Youtube className="h-4 w-4" />
                                </Button>

                                <div className="w-px h-8 bg-border mx-1" />

                                {/* Code */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('code-inline')}
                                    title="Insert Inline Code"
                                >
                                    <Code className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMarkdownDialog('code-block')}
                                    title="Insert Code Block"
                                    className="gap-1"
                                >
                                    <Code className="h-4 w-4" />
                                    <span className="text-xs">Block</span>
                                </Button>
                            </div>
                        </Card>

                        <Textarea
                            ref={textareaRef}
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your guide content here. You can use Markdown formatting!"
                            rows={20}
                            className={errors.content ? 'border-destructive font-mono text-sm' : 'font-mono text-sm'}
                        />
                        <div className="flex justify-between text-xs">
                            {errors.content ? (
                                <span className="text-destructive">{errors.content}</span>
                            ) : (
                                <span className="text-muted-foreground">
                                    Markdown supported: **bold**, *italic*, lists, links, images, videos, code blocks
                                </span>
                            )}
                            <span className="text-muted-foreground">{content.length} characters</span>
                        </div>
                        <Card className="p-4 bg-muted/50">
                            <p className="text-sm font-medium mb-2">Markdown Tips:</p>
                            <ul className="text-xs space-y-1 text-muted-foreground">
                                <li>• Headings: # H1, ## H2, ### H3</li>
                                <li>• Bold: **text**, Italic: *text*</li>
                                <li>• Lists: Start lines with - or 1.</li>
                                <li>• Links: [text](url)</li>
                                <li>• Images: ![alt](url)</li>
                                <li>• Youtube: [alt](https://www.youtube.com/watch?v=XXXX)</li>
                                <li>• Code: `inline` or ```block```</li>
                            </ul>
                        </Card>
                    </TabsContent>
                    <TabsContent value="preview">
                        <Card className="p-6 min-h-[400px]">
                            {content.trim() ? (
                                <div className="prose dark:prose-invert max-w-none">
                                    <Markdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[[
                                            rehypeSanitize,
                                            sanitizeSchema]]}
                                        components={{
                                            a: ({ node, href, children, ...props }) => {
                                                // Check if it's a YouTube link
                                                const youtubeMatch = href?.match(
                                                    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
                                                );

                                                if (youtubeMatch) {
                                                    const videoId = youtubeMatch[1];
                                                    return (
                                                        <div className="not-prose my-6">
                                                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                                                <iframe
                                                                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                                                                    src={`https://www.youtube.com/embed/${videoId}`}
                                                                    title="YouTube video player"
                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                    allowFullScreen
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Regular link
                                                return (
                                                    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                                                        {children}
                                                    </a>
                                                );
                                            }
                                        }}
                                    >
                                        {content}
                                    </Markdown>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-12">
                                    Start writing to see a preview of your guide
                                </p>
                            )}
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={submitting}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                >
                    {submitting
                        ? (mode === 'create' ? 'Creating...' : 'Saving...')
                        : (mode === 'create' ? 'Create Guide' : 'Save Changes')}
                </Button>
            </div>

            {/* Markdown Input Dialog */}
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {dialogType === 'heading1' && 'Insert H1 Heading'}
                            {dialogType === 'heading2' && 'Insert H2 Heading'}
                            {dialogType === 'heading3' && 'Insert H3 Heading'}
                            {dialogType === 'bold' && 'Insert Bold Text'}
                            {dialogType === 'italic' && 'Insert Italic Text'}
                            {dialogType === 'list' && 'Insert Unordered List'}
                            {dialogType === 'ordered-list' && 'Insert Ordered List'}
                            {dialogType === 'link' && 'Insert Link'}
                            {dialogType === 'image' && 'Insert Image'}
                            {dialogType === 'youtube' && 'Insert YouTube Video'}
                            {dialogType === 'code-inline' && 'Insert Inline Code'}
                            {dialogType === 'code-block' && 'Insert Code Block'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {(dialogType === 'heading1' || dialogType === 'heading2' || dialogType === 'heading3') &&
                                'Enter the heading text'}
                            {(dialogType === 'bold' || dialogType === 'italic') &&
                                'Enter the text to format'}
                            {(dialogType === 'list' || dialogType === 'ordered-list') &&
                                'Enter list items separated by commas'}
                            {dialogType === 'link' && 'Enter the link text and URL'}
                            {dialogType === 'image' && 'Enter the image description and URL'}
                            {dialogType === 'youtube' && 'Enter the YouTube video URL and description'}
                            {(dialogType === 'code-inline' || dialogType === 'code-block') &&
                                'Enter the code'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Heading, Bold, Italic - single text input */}
                        {(dialogType === 'heading1' || dialogType === 'heading2' || dialogType === 'heading3' ||
                            dialogType === 'bold' || dialogType === 'italic') && (
                            <div className="space-y-2">
                                <Label htmlFor="text">Text</Label>
                                <Input
                                    id="text"
                                    value={dialogInputs.text || ''}
                                    onChange={(e) => setDialogInputs({ ...dialogInputs, text: e.target.value })}
                                    placeholder="Enter text"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Lists - comma-separated items */}
                        {(dialogType === 'list' || dialogType === 'ordered-list') && (
                            <div className="space-y-2">
                                <Label htmlFor="items">List Items</Label>
                                <Input
                                    id="items"
                                    value={dialogInputs.items || ''}
                                    onChange={(e) => setDialogInputs({ ...dialogInputs, items: e.target.value })}
                                    placeholder="Item 1, Item 2, Item 3"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Link - text and URL */}
                        {dialogType === 'link' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="link-text">Link Text</Label>
                                    <Input
                                        id="link-text"
                                        value={dialogInputs.text || ''}
                                        onChange={(e) => setDialogInputs({ ...dialogInputs, text: e.target.value })}
                                        placeholder="Click here"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="link-url">URL</Label>
                                    <Input
                                        id="link-url"
                                        value={dialogInputs.url || ''}
                                        onChange={(e) => setDialogInputs({ ...dialogInputs, url: e.target.value })}
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </>
                        )}

                        {/* Image - alt and URL */}
                        {dialogType === 'image' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="image-alt">Description (Alt Text)</Label>
                                    <Input
                                        id="image-alt"
                                        value={dialogInputs.alt || ''}
                                        onChange={(e) => setDialogInputs({ ...dialogInputs, alt: e.target.value })}
                                        placeholder="Image description"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="image-url">Image URL</Label>
                                    <Input
                                        id="image-url"
                                        value={dialogInputs.url || ''}
                                        onChange={(e) => setDialogInputs({ ...dialogInputs, url: e.target.value })}
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                            </>
                        )}

                        {/* YouTube - URL and description */}
                        {dialogType === 'youtube' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="youtube-url">YouTube URL</Label>
                                    <Input
                                        id="youtube-url"
                                        value={dialogInputs.url || ''}
                                        onChange={(e) => setDialogInputs({ ...dialogInputs, url: e.target.value })}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="youtube-description">Description (Optional)</Label>
                                    <Input
                                        id="youtube-description"
                                        value={dialogInputs.description || ''}
                                        onChange={(e) => setDialogInputs({ ...dialogInputs, description: e.target.value })}
                                        placeholder="YouTube video"
                                    />
                                </div>
                            </>
                        )}

                        {/* Inline Code - single input */}
                        {dialogType === 'code-inline' && (
                            <div className="space-y-2">
                                <Label htmlFor="code">Code</Label>
                                <Input
                                    id="code"
                                    value={dialogInputs.code || ''}
                                    onChange={(e) => setDialogInputs({ ...dialogInputs, code: e.target.value })}
                                    placeholder="const x = 1"
                                    className="font-mono"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Code Block - language and code */}
                        {dialogType === 'code-block' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="language">Language (Optional)</Label>
                                    <Input
                                        id="language"
                                        value={dialogInputs.language || ''}
                                        onChange={(e) => setDialogInputs({ ...dialogInputs, language: e.target.value })}
                                        placeholder="javascript, python, etc."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code-block">Code</Label>
                                    <Textarea
                                        id="code-block"
                                        value={dialogInputs.code || ''}
                                        onChange={(e) => setDialogInputs({ ...dialogInputs, code: e.target.value })}
                                        placeholder="Enter your code here"
                                        className="font-mono"
                                        rows={6}
                                        autoFocus
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDialogInputs({})}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDialogSubmit}>Insert</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
