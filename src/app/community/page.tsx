"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Heart, MessageCircle, Share, MoreHorizontal, Clock, Image as ImageIcon, X, Trash2, Send, Edit2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { blogAPI, userAPI, communityAPI } from "@/lib/api";
import { useChatContext } from "@/contexts/ChatContext";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CommunityPage() {
    const router = useRouter();
    const { chitChatChats, messages: contextMessages } = useChatContext();
    const [activeTab, setActiveTab] = useState("references");
    const [currentView, setCurrentView] = useState("community");
    const [posts, setPosts] = useState<any[]>([]);
    const [learnings, setLearnings] = useState<any[]>([]);
    const [references, setReferences] = useState<any[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [loadingLearnings, setLoadingLearnings] = useState(false);
    const [loadingReferences, setLoadingReferences] = useState(false);
    const [newPostContent, setNewPostContent] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [isCreatingPost, setIsCreatingPost] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [editingPost, setEditingPost] = useState<any | null>(null);
    const [editPostContent, setEditPostContent] = useState("");
    const [editPostImage, setEditPostImage] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string>("");
    const [isUpdatingPost, setIsUpdatingPost] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const statusColors = [
        "bg-green-400",
        "bg-pink-400",
        "bg-red-400",
        "bg-yellow-400",
        "bg-blue-400",
        "bg-purple-400",
        "bg-green-400",
        "bg-pink-400",
        "bg-red-400",
        "bg-yellow-400"
    ];

    useEffect(() => {
        // Fetch current user profile
        const fetchUserProfile = async () => {
            try {
                const profile = await userAPI.getProfile();
                setCurrentUser(profile);
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            }
        };

        fetchUserProfile();
    }, []);

    const loadPosts = useCallback(async () => {
        try {
            setLoadingPosts(true);
            const data = await blogAPI.getAll('published');
            setPosts(data.map((blog: any) => {
                // Use current user's name if this is their post, otherwise use author name from backend
                let authorName = blog.author?.name || "Anonymous";
                if (currentUser && blog.author?._id === currentUser.id) {
                    authorName = currentUser.name;
                }

                // Check if current user has liked this post
                const isLiked = currentUser && blog.likes?.some((likeId: string) => likeId === currentUser.id);

                return {
                    id: blog._id,
                    author: authorName,
                    authorId: blog.author?._id,
                    authorAvatar: blog.author?.avatar,
                    time: new Date(blog.publishedAt || blog.createdAt).toLocaleString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    title: blog.title,
                    content: blog.content,
                    image: blog.coverImage && typeof blog.coverImage === 'string' && blog.coverImage.trim() !== ''
    ? (blog.coverImage.startsWith('http://') || blog.coverImage.startsWith('https://')
        ? blog.coverImage
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/${blog.coverImage.replace(/^\/+/, '')}`)
    : null,
                    likes: blog.likes?.length || 0,
                    isLiked: isLiked,
                    comments: blog.comments?.length || 0,
                    shares: 0,
                    tags: blog.tags || [],
                    slug: blog.slug
                };
            }));
        } catch (error: any) {
            console.error("Failed to load posts:", error);
            alert("Failed to load posts. Please try again later.");
        } finally {
            setLoadingPosts(false);
        }
    }, [currentUser]);

    useEffect(() => {
        if (activeTab === "posts") {
            loadPosts();
        } else if (activeTab === "learnings") {
            loadLearnings();
        } else if (activeTab === "references") {
            loadReferences();
        }
    }, [activeTab, currentUser, loadPosts]);

    const loadLearnings = async () => {
        try {
            setLoadingLearnings(true);
            const data = await communityAPI.getLearnings();
            setLearnings(data);
        } catch (error) {
            console.error("Failed to load learnings:", error);
        } finally {
            setLoadingLearnings(false);
        }
    };

    const loadReferences = async () => {
        try {
            setLoadingReferences(true);
            const data = await communityAPI.getReferences();
            setReferences(data);
        } catch (error) {
            console.error("Failed to load references:", error);
        } finally {
            setLoadingReferences(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert("Please select an image file");
                return;
            }
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setImagePreview("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !selectedImage) {
            alert("Please enter some content or select an image for your post");
            return;
        }

        if (isCreatingPost) {
            return; // Prevent double submission
        }

        try {
            setIsCreatingPost(true);

            const postData: any = {
                title: newPostContent.substring(0, 50) || "Community Post",
                content: newPostContent,
                status: 'published',
                tags: ['community'],
            };

            // If there's an image, upload it to S3 first
            if (selectedImage) {
                const uploadData = await blogAPI.uploadImage(selectedImage);
                console.log('Image upload URL:', uploadData.url);
                postData.coverImage = uploadData.url;
            }

            await blogAPI.create(postData);

            alert("Post created successfully!");
            setNewPostContent("");
            setSelectedImage(null);
            setImagePreview("");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            loadPosts();
        } catch (error: any) {
            console.error("Failed to create post:", error);
            alert(error.message || "Failed to create post. Please try again.");
        } finally {
            setIsCreatingPost(false);
        }
    };

    const handleLikePost = async (postId: string) => {
        try {
            const result = await blogAPI.toggleLike(postId);
            setPosts(posts.map(post =>
                post.id === postId
                    ? { ...post, likes: result.likesCount, isLiked: result.liked }
                    : post
            ));
        } catch (error) {
            console.error("Failed to toggle like:", error);
        }
    };

    const handleViewChange = (view: string) => {
        setCurrentView(view);
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Are you sure you want to delete this post?")) return;
        try {
            await blogAPI.delete(postId);
            setPosts(posts.filter(post => post.id !== postId));
        } catch {
            alert("Failed to delete post");
        }
    };

    const handleViewComments = async (postId: string) => {
        setSelectedPostForComments(postId);
        setLoadingComments(true);
        try {
            const commentsData = await blogAPI.getComments(postId);
            setComments(commentsData);
            // Update comment count in posts to reflect actual count
            setPosts(posts.map(post =>
                post.id === postId
                    ? { ...post, comments: commentsData.length }
                    : post
            ));
        } catch (error) {
            console.error("Failed to load comments:", error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleAddComment = async (postId: string) => {
        if (!newComment.trim()) return;
        try {
            await blogAPI.addComment(postId, newComment);
            setNewComment("");
            // Reload comments
            const commentsData = await blogAPI.getComments(postId);
            setComments(commentsData);
            // Update comment count in posts
            setPosts(posts.map(post =>
                post.id === postId
                    ? { ...post, comments: commentsData.length }
                    : post
            ));
        } catch (error) {
            console.error("Failed to add comment:", error);
            alert("Failed to add comment");
        }
    };

    const handleCloseComments = () => {
        setSelectedPostForComments(null);
        setComments([]);
        setNewComment("");
    };

    const handleEditPost = (post: any) => {
        setEditingPost(post);
        setEditPostContent(post.content);
        setEditImagePreview(post.image || "");
    };

    const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert("Please select an image file");
                return;
            }
            setEditPostImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveEditImage = () => {
        setEditPostImage(null);
        setEditImagePreview("");
        if (editFileInputRef.current) {
            editFileInputRef.current.value = "";
        }
    };

    const handleUpdatePost = async () => {
        if (!editingPost) return;
        if (!editPostContent.trim() && !editImagePreview) {
            alert("Please enter some content or select an image for your post");
            return;
        }

        if (isUpdatingPost) return;

        try {
            setIsUpdatingPost(true);

            const updateData: any = {
                title: editPostContent.substring(0, 50) || "Community Post",
                content: editPostContent,
            };

            // If there's a new image, upload it first
            if (editPostImage) {
                const uploadData = await blogAPI.uploadImage(editPostImage);
                updateData.coverImage = uploadData.url;
            } else if (!editImagePreview) {
                // If image was removed and no new image, set coverImage to empty
                updateData.coverImage = "";
            }

            await blogAPI.update(editingPost.id, updateData);

            alert("Post updated successfully!");

            // Reset edit state
            setEditingPost(null);
            setEditPostContent("");
            setEditPostImage(null);
            setEditImagePreview("");
            if (editFileInputRef.current) {
                editFileInputRef.current.value = "";
            }

            // Reload posts
            loadPosts();
        } catch (error: any) {
            console.error("Failed to update post:", error);
            alert(error.message || "Failed to update post. Please try again.");
        } finally {
            setIsUpdatingPost(false);
        }
    };

    const handleCloseEditPost = () => {
        setEditingPost(null);
        setEditPostContent("");
        setEditPostImage(null);
        setEditImagePreview("");
        if (editFileInputRef.current) {
            editFileInputRef.current.value = "";
        }
    };

    const tabTriggerClasses = "rounded-full px-6 py-2 text-sm font-medium border bg-white text-gray-700 shadow-none data-[state=active]:bg-gray-800 data-[state=active]:text-white";

    return (
        <div className="min-h-screen bg-white flex">
            <Sidebar currentView={currentView} onViewChange={handleViewChange} />

            <div className="flex-1 flex flex-row">
                <main className="flex-1 p-4 sm:p-6 flex gap-4 sm:gap-6 bg-gray-50">
                    <div className="flex-1">
                        <div className="max-w-5xl">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 lg:gap-16 mb-6 sm:mb-8">
                                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Community</h1>
                                <div className="relative flex-1 w-full max-w-md">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        placeholder="Search"
                                        className="pl-11 bg-white h-10 w-full"
                                        style={{
                                          borderRadius: '24px',
                                          border: '1px solid #E6E6E6',
                                          background: '#FFF',
                                          boxShadow: '0 4px 4px 0 rgba(221, 221, 221, 0.25)',
                                        }}
                                    />
                                </div>
                            </div>

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <div className="flex items-center justify-between mb-6">
                                    <TabsList className="bg-transparent p-0 w-auto flex gap-4">
                                        <TabsTrigger value="learnings" className={tabTriggerClasses}>
                                            Learnings
                                        </TabsTrigger>
                                        <TabsTrigger value="references" className={tabTriggerClasses}>
                                            References
                                        </TabsTrigger>
                                        <TabsTrigger value="posts" className={tabTriggerClasses}>
                                            Posts
                                        </TabsTrigger>
                                    </TabsList>

                                    {activeTab !== 'posts' && (
                                        <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200">Post Reference</Button>
                                    )}
                                </div>

                                <TabsContent value="references" className="space-y-6">
                                    {loadingReferences ? (
                                        <div className="text-center py-8 text-muted-foreground">Loading references...</div>
                                    ) : references.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">No references available yet.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                            {references.map((project) => (
                                                <div
                                                    key={project._id}
                                                    className="relative cursor-pointer group overflow-hidden flex justify-center items-center h-48 w-full"
                                                >
                                                    <div
                                                        className="w-full h-full rounded-2xl transition-all duration-300"
                                                        style={{
                                                            border: '0.5px solid #CCC',
                                                            backgroundImage: `url(${project.image})`,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center',
                                                            backgroundColor: 'lightgray'
                                                        }}
                                                    >
                                                        {/* Hover overlay */}
                                                        <div
                                                            className="w-full h-full rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-6"
                                                            style={{
                                                                background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.60) 0%, rgba(0, 0, 0, 0.60) 100%)'
                                                            }}
                                                        >
                                                            <h3 className="font-semibold text-white text-lg mb-2">{project.title}</h3>
                                                            <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full">
                                                                {project.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="posts" className="space-y-6 flex flex-col items-center">
                                    <div
                                        className="w-full lg:w-[720px]"
                                        style={{
                                            minHeight: '73px',
                                            flexShrink: 0,
                                            borderRadius: '16px',
                                            border: '0.5px solid #D9D9D9',
                                            background: '#FFF',
                                            padding: '12px 16px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Avatar style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                                                <AvatarImage src={currentUser?.avatar || "/placeholder.svg"} />
                                                <AvatarFallback>{currentUser?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                                            </Avatar>
                                            <Input
                                                placeholder="What's on your mind?"
                                                value={newPostContent}
                                                onChange={(e) => setNewPostContent(e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey && !isCreatingPost) {
                                                        e.preventDefault();
                                                        handleCreatePost();
                                                    }
                                                }}
                                                disabled={isCreatingPost}
                                                style={{
                                                    width: '400px',
                                                    height: '40px',
                                                    flexShrink: 0,
                                                    borderRadius: '8px',
                                                    border: '0.5px solid #E0E0E0',
                                                    background: '#FAF9F6'
                                                }}
                                                className="border-none shadow-none text-base focus-visible:ring-0"
                                            />
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                                style={{ display: 'none' }}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isCreatingPost}
                                                className="h-10 w-10"
                                            >
                                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                            </Button>
                                            <Button
                                                onClick={handleCreatePost}
                                                disabled={isCreatingPost}
                                                style={{
                                                    width: '128px',
                                                    height: '40px',
                                                    flexShrink: 0,
                                                    borderRadius: '8px',
                                                    background: 'rgba(110, 110, 110, 0.20)'
                                                }}
                                                className="hover:opacity-80"
                                            >
                                                {isCreatingPost ? "Sharing..." : "Share"}
                                            </Button>
                                        </div>
                                        {imagePreview && (
                                            <div className="mt-3 relative inline-block">
                                                <Image
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    width={400}
                                                    height={200}
                                                    className="rounded-lg object-contain"
                                                    style={{ maxHeight: '200px', maxWidth: '100%' }}
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={handleRemoveImage}
                                                    className="absolute top-2 right-2 h-8 w-8"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {loadingPosts ? (
                                        <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
                                    ) : posts.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No posts yet. Be the first to share something!
                                        </div>
                                    ) : (
                                        <div className="space-y-6 flex flex-col items-center">
                                            {posts.map((post) => (
                                                <div
                                                    key={post.id}
                                                    className="cursor-pointer hover:shadow-lg transition-shadow w-full lg:w-[720px] rounded-2xl border border-gray-200 bg-white p-4 flex flex-col gap-3"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="w-10 h-10">
                                                                <AvatarImage src={post.authorAvatar || "/placeholder.svg"} />
                                                                <AvatarFallback>{post.author.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <h3 className="font-medium text-sm">{post.author}</h3>
                                                                <p className="text-xs text-muted-foreground">{post.time}</p>
                                                            </div>
                                                        </div>
                                                        {currentUser && post.authorId === currentUser.id && (
                                                            <DropdownMenu>
                                                              <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                  <MoreHorizontal className="w-5 h-5" />
                                                                </Button>
                                                              </DropdownMenuTrigger>
                                                              <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleEditPost(post)}>
                                                                  <Edit2 className="w-4 h-4 mr-2" /> Edit Post
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-red-600">
                                                                  <Trash2 className="w-4 h-4 mr-2" /> Delete Post
                                                                </DropdownMenuItem>
                                                              </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 overflow-hidden">
                                                        {post.title && post.title !== post.content && (
                                                            <h2 className="text-lg font-semibold mb-2">{post.title}</h2>
                                                        )}
                                                        <p className="text-sm mb-3 whitespace-pre-line">{post.content}</p>
                                                        {post.image && (
                                                            (() => { console.log('Post image URL:', post.image); return null; })()
                                                        )}
                                                        {post.image && (
                                                            <div
                                                                className="w-full h-48 sm:h-64 rounded-2xl bg-gray-200"
                                                                style={{
                                                                    backgroundImage: `url(${post.image})`,
                                                                    backgroundSize: 'cover',
                                                                    backgroundPosition: 'center'
                                                                }}
                                                            />
                                                        )}
                                                        {post.tags && post.tags.length > 0 && (
                                                            <div className="flex gap-2 mt-3">
                                                                {post.tags.map((tag: string, idx: number) => (
                                                                    <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                                                        #{tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            width: '120px',
                                                            height: '24px',
                                                            justifyContent: 'center',
                                                            alignItems: 'flex-start',
                                                            gap: '24px',
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={`gap-1 hover:text-primary p-0 h-auto ${post.isLiked ? 'text-red-500' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleLikePost(post.id);
                                                            }}
                                                        >
                                                            <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                                                            <span className="text-xs">{post.likes}</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="gap-1 hover:text-primary p-0 h-auto"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewComments(post.id);
                                                            }}
                                                        >
                                                            <MessageCircle className="w-4 h-4" />
                                                            <span className="text-xs">{post.comments}</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="gap-1 hover:text-primary p-0 h-auto"
                                                        >
                                                            <Share className="w-4 h-4" />
                                                            <span className="text-xs">{post.shares}</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="learnings" className="space-y-6">
                                    {loadingLearnings ? (
                                        <div className="text-center py-8 text-muted-foreground">Loading learnings...</div>
                                    ) : learnings.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">No learnings available yet.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                            {learnings.map((course) => (
                                                <div
                                                    key={course._id}
                                                    className="cursor-pointer group overflow-hidden"
                                                    style={{
                                                        width: '318px',
                                                        height: '336px',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <div
                                                        className="relative"
                                                        style={{
                                                            width: '318px',
                                                            height: '256px',
                                                            flexShrink: 0,
                                                            borderRadius: '16px 16px 0 0',
                                                            border: '1px solid #D9D9D9',
                                                            backgroundImage: `url(${course.image})`,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center',
                                                            backgroundColor: 'lightgray'
                                                        }}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                                                        <div className="absolute bottom-0 left-0 p-4 w-full">
                                                            <h3 className="font-bold text-white drop-shadow-md">{course.title}</h3>
                                                            <p className="text-xs text-white/90 drop-shadow-md">{course.subtitle}</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 bg-white" style={{ width: '318px', height: '80px', flexShrink: 0, borderRadius: '0 0 16px 16px', border: '1px solid #D9D9D9', borderTop: 'none' }}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{course.category}</span>
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Clock className="w-3 h-3" />
                                                                {course.duration}
                                                            </div>
                                                        </div>
                                                        <div className="mt-3" style={{ width: '216px', height: '8px', flexShrink: 0, position: 'relative' }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="218" height="10" viewBox="0 0 218 10" fill="none" style={{ width: '216px', height: '8px' }}>
                                                                <rect x="1" y="1" width="216" height="8" rx="4" stroke="#AAAAAA"/>
                                                                <rect x="1" y="1" width={`${(course.progress / 100) * 216}`} height="8" rx="4" fill="#3C3C3C"/>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </main>

                {activeTab === 'posts' && (
                    <div
                        className="hidden lg:block"
                        style={{
                            width: '296px',
                            minHeight: '100vh',
                            height: '100%',
                            flexShrink: 0,
                            padding: '16px',
                            background: '#FAFAFA',
                            boxSizing: 'border-box',
                        }}
                    >
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold mb-4">Messages</h2>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    placeholder="Search"
                                    className="pl-11 bg-white h-8 w-full"
                                    style={{
                                        width: '264px',
                                        borderRadius: '24px',
                                        border: '1px solid #E6E6E6',
                                        background: '#FFF',
                                        boxShadow: '0 4px 4px 0 rgba(221, 221, 221, 0.25)',
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div
                                className="flex gap-2 mb-4"
                                style={{
                                    width: '295px',
                                    height: '25px',
                                    flexShrink: 0
                                }}
                            >
                                <Button variant="default" size="sm" className="bg-primary text-primary-foreground h-full">
                                    General
                                </Button>
                                <Button variant="ghost" size="sm" className="h-full">
                                    Teams
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {chitChatChats.length > 0 ? (
                                    chitChatChats.map((chat, index) => {
                                        // Get the last message for this chat
                                        const chatMessages = contextMessages[chat.name] || [];
                                        const lastMessage = chatMessages[chatMessages.length - 1];
                                        const preview = lastMessage?.content || chat.status;

                                        return (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                                                onClick={() => router.push('/chat')}
                                            >
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={chat.avatar} />
                                                    <AvatarFallback>{chat.name.charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0 max-w-[150px]">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium text-sm truncate">{chat.name}</h4>
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[index % statusColors.length]}`}></div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{preview}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                        No chats yet. Visit the chat page to start a conversation.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Comments Dialog */}
            <Dialog open={selectedPostForComments !== null} onOpenChange={(open) => !open && handleCloseComments()}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white text-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">Comments</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {loadingComments ? (
                            <div className="text-center py-4 text-gray-600">Loading comments...</div>
                        ) : (
                            <>
                                {/* Comment input */}
                                <div className="flex gap-2">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={currentUser?.avatar || "/placeholder.svg"} />
                                        <AvatarFallback className="bg-purple-600 text-white">{currentUser?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 flex gap-2">
                                        <Input
                                            placeholder="Write a comment..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey && selectedPostForComments) {
                                                    e.preventDefault();
                                                    handleAddComment(selectedPostForComments);
                                                }
                                            }}
                                            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                                        />
                                        <Button
                                            size="icon"
                                            onClick={() => selectedPostForComments && handleAddComment(selectedPostForComments)}
                                            disabled={!newComment.trim()}
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Comments list */}
                                <div className="space-y-4">
                                    {comments.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            No comments yet. Be the first to comment!
                                        </div>
                                    ) : (
                                        comments.map((comment: any) => (
                                            <div key={comment._id} className="flex gap-3">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={comment.author?.avatar || "/placeholder.svg"} />
                                                    <AvatarFallback className="bg-gray-600 text-white">{comment.author?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                                                        <div className="font-semibold text-sm text-gray-900">{comment.author?.name || "Anonymous"}</div>
                                                        <p className="text-sm text-gray-700">{comment.content}</p>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1 px-3">
                                                        {new Date(comment.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Post Dialog */}
            <Dialog open={editingPost !== null} onOpenChange={(open) => !open && handleCloseEditPost()}>
                <DialogContent className="max-w-2xl bg-white text-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">Edit Post</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block text-gray-900">Content</label>
                            <textarea
                                placeholder="What's on your mind?"
                                value={editPostContent}
                                onChange={(e) => setEditPostContent(e.target.value)}
                                disabled={isUpdatingPost}
                                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        {imagePreview && (
                            <div className="relative inline-block">
                                <Image
                                    src={imagePreview}
                                    alt="Preview"
                                    width={400}
                                    height={256}
                                    className="rounded-lg max-h-64 max-w-full object-contain"
                                />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={handleRemoveImage}
                                    disabled={isCreatingPost}
                                    className="absolute top-2 right-2 h-8 w-8"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <input
                                ref={editFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleEditImageSelect}
                                style={{ display: 'none' }}
                            />
                            <Button
                                variant="outline"
                                onClick={() => editFileInputRef.current?.click()}
                                disabled={isUpdatingPost}
                                className="flex items-center gap-2 border-gray-300 text-gray-900 hover:bg-gray-100"
                            >
                                <ImageIcon className="w-4 h-4" />
                                {editImagePreview ? 'Change Image' : 'Add Image'}
                            </Button>
                            <div className="flex-1"></div>
                            <Button
                                variant="outline"
                                onClick={handleCloseEditPost}
                                disabled={isUpdatingPost}
                                className="border-gray-300 text-gray-900 hover:bg-gray-100"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdatePost}
                                disabled={isUpdatingPost || (!editPostContent.trim() && !editImagePreview)}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {isUpdatingPost ? "Updating..." : "Update Post"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
