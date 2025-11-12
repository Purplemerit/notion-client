"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminSidebar from "@/components/adminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Plus, Edit2, Trash2, Book, Link as LinkIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { communityAPI, userAPI } from "@/lib/api";

type TabType = "learnings" | "references";

interface Learning {
  _id?: string;
  title: string;
  subtitle: string;
  category: string;
  duration: string;
  progress: number;
  image: string;
  chapters: Chapter[];
}

interface Chapter {
  title: string;
  topics: string[];
  resources: Resource[];
}

interface Resource {
  title: string;
  url: string;
  type: string;
}

interface Reference {
  _id?: string;
  title: string;
  category: string;
  description: string;
  url: string;
  image: string;
}

export default function AdminCommunityPage() {
  const [activeTab, setActiveTab] = useState<TabType>("learnings");
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [editingLearning, setEditingLearning] = useState<Learning | null>(null);
  const [editingReference, setEditingReference] = useState<Reference | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Learning form state
  const [learningForm, setLearningForm] = useState<Learning>({
    title: "",
    subtitle: "",
    category: "",
    duration: "",
    progress: 0,
    image: "",
    chapters: [],
  });

  // Reference form state
  const [referenceForm, setReferenceForm] = useState<Reference>({
    title: "",
    category: "",
    description: "",
    url: "",
    image: "",
  });

  // Chapter form state
  const [currentChapter, setCurrentChapter] = useState<Chapter>({
    title: "",
    topics: [],
    resources: [],
  });
  const [topicInput, setTopicInput] = useState("");
  const [resourceInput, setResourceInput] = useState<Resource>({
    title: "",
    url: "",
    type: "article",
  });

  const loadCurrentUser = async () => {
    try {
      const user = await userAPI.getProfile();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadData = useCallback(async () => {
    try {
      if (activeTab === "learnings") {
        const data = await communityAPI.getLearnings();
        setLearnings(data);
      } else {
        const data = await communityAPI.getReferences();
        setReferences(data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }, [activeTab]);

  useEffect(() => {
    loadCurrentUser();
    loadData();
  }, [loadData]);

  const handleCreateLearning = async () => {
    try {
      if (editingLearning) {
        await communityAPI.updateLearning(editingLearning._id!, learningForm);
      } else {
        await communityAPI.createLearning(learningForm);
      }
      setShowLearningModal(false);
      resetLearningForm();
      loadData();
    } catch (error) {
      console.error("Failed to save learning:", error);
      alert("Failed to save learning");
    }
  };

  const handleCreateReference = async () => {
    try {
      if (editingReference) {
        await communityAPI.updateReference(editingReference._id!, referenceForm);
      } else {
        await communityAPI.createReference(referenceForm);
      }
      setShowReferenceModal(false);
      resetReferenceForm();
      loadData();
    } catch (error) {
      console.error("Failed to save reference:", error);
      alert("Failed to save reference");
    }
  };

  const handleDeleteLearning = async (id: string) => {
    if (!confirm("Are you sure you want to delete this learning?")) return;
    try {
      await communityAPI.deleteLearning(id);
      loadData();
    } catch (error) {
      console.error("Failed to delete learning:", error);
      alert("Failed to delete learning");
    }
  };

  const handleDeleteReference = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reference?")) return;
    try {
      await communityAPI.deleteReference(id);
      loadData();
    } catch (error) {
      console.error("Failed to delete reference:", error);
      alert("Failed to delete reference");
    }
  };

  const resetLearningForm = () => {
    setLearningForm({
      title: "",
      subtitle: "",
      category: "",
      duration: "",
      progress: 0,
      image: "",
      chapters: [],
    });
    setEditingLearning(null);
  };

  const resetReferenceForm = () => {
    setReferenceForm({
      title: "",
      category: "",
      description: "",
      url: "",
      image: "",
    });
    setEditingReference(null);
  };

  const addChapter = () => {
    if (!currentChapter.title) {
      alert("Please enter a chapter title");
      return;
    }
    setLearningForm({
      ...learningForm,
      chapters: [...learningForm.chapters, currentChapter],
    });
    setCurrentChapter({
      title: "",
      topics: [],
      resources: [],
    });
  };

  const addTopic = () => {
    if (!topicInput.trim()) return;
    setCurrentChapter({
      ...currentChapter,
      topics: [...currentChapter.topics, topicInput],
    });
    setTopicInput("");
  };

  const addResource = () => {
    if (!resourceInput.title || !resourceInput.url) {
      alert("Please enter both title and URL for the resource");
      return;
    }
    setCurrentChapter({
      ...currentChapter,
      resources: [...currentChapter.resources, resourceInput],
    });
    setResourceInput({
      title: "",
      url: "",
      type: "article",
    });
  };

  const editLearning = (learning: Learning) => {
    setEditingLearning(learning);
    setLearningForm(learning);
    setShowLearningModal(true);
  };

  const editReference = (reference: Reference) => {
    setEditingReference(reference);
    setReferenceForm(reference);
    setShowReferenceModal(true);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F7F5FD" }}>
      {/* Sidebar */}
      <div style={{ flexShrink: 0, height: "100vh" }}>
        <AdminSidebar />
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
        {/* Header */}
        <AdminHeader
          currentUser={currentUser}
          searchPlaceholder="Search resources..."
        />

        {/* Main Scrollable Content */}
        <main
          style={{
            display: "flex",
            flex: 1,
            overflow: "auto",
            scrollBehavior: "smooth",
            background: "#F7F5FD",
            padding: "24px",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={{ fontSize: 32, fontWeight: 600, color: "#252525" }}>Community Management</h1>
            <Button
              onClick={() => {
                if (activeTab === "learnings") {
                  setShowLearningModal(true);
                } else {
                  setShowReferenceModal(true);
                }
              }}
              style={{
                background: "#8B7BE8",
                color: "white",
                padding: "12px 24px",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Plus size={20} />
              Add {activeTab === "learnings" ? "Learning" : "Reference"}
            </Button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <Button
              onClick={() => setActiveTab("learnings")}
              style={{
                padding: "12px 32px",
                borderRadius: 24,
                background: activeTab === "learnings" ? "#8B7BE8" : "#FFF",
                color: activeTab === "learnings" ? "#FFF" : "#666",
                border: "1px solid #E1DEF6",
                fontWeight: 600,
              }}
            >
              <Book size={20} style={{ marginRight: 8 }} />
              Learnings
            </Button>
            <Button
              onClick={() => setActiveTab("references")}
              style={{
                padding: "12px 32px",
                borderRadius: 24,
                background: activeTab === "references" ? "#8B7BE8" : "#FFF",
                color: activeTab === "references" ? "#FFF" : "#666",
                border: "1px solid #E1DEF6",
                fontWeight: 600,
              }}
            >
              <LinkIcon size={20} style={{ marginRight: 8 }} />
              References
            </Button>
          </div>

          {/* Content */}
          {activeTab === "learnings" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
              {learnings.map((learning) => (
                <Card
                  key={learning._id}
                  style={{
                    padding: 0,
                    background: "#FFF",
                    borderRadius: 16,
                    border: "1px solid #E1DEF6",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 180,
                      backgroundImage: `url(${learning.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundColor: "lightgray",
                      position: "relative",
                    }}
                  >
                    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
                      <Button
                        onClick={() => editLearning(learning)}
                        style={{
                          width: 36,
                          height: 36,
                          background: "rgba(255, 255, 255, 0.9)",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        <Edit2 size={16} color="#8B7BE8" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteLearning(learning._id!)}
                        style={{
                          width: 36,
                          height: 36,
                          background: "rgba(255, 255, 255, 0.9)",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        <Trash2 size={16} color="#FF6B6B" />
                      </Button>
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{learning.title}</h3>
                    <p style={{ fontSize: 14, color: "#999", marginBottom: 12 }}>{learning.subtitle}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, background: "#F5F5FF", color: "#8B7BE8", padding: "4px 12px", borderRadius: 12, fontWeight: 600 }}>
                        {learning.category}
                      </span>
                      <span style={{ fontSize: 12, color: "#999" }}>{learning.duration}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>
                      {learning.chapters.length} chapters
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
              {references.map((reference) => (
                <Card
                  key={reference._id}
                  style={{
                    padding: 0,
                    background: "#FFF",
                    borderRadius: 16,
                    border: "1px solid #E1DEF6",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 180,
                      backgroundImage: `url(${reference.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundColor: "lightgray",
                      position: "relative",
                    }}
                  >
                    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
                      <Button
                        onClick={() => editReference(reference)}
                        style={{
                          width: 36,
                          height: 36,
                          background: "rgba(255, 255, 255, 0.9)",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        <Edit2 size={16} color="#8B7BE8" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteReference(reference._id!)}
                        style={{
                          width: 36,
                          height: 36,
                          background: "rgba(255, 255, 255, 0.9)",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        <Trash2 size={16} color="#FF6B6B" />
                      </Button>
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{reference.title}</h3>
                    <span style={{ fontSize: 12, background: "#F5F5FF", color: "#8B7BE8", padding: "4px 12px", borderRadius: 12, fontWeight: 600 }}>
                      {reference.category}
                    </span>
                    <p style={{ fontSize: 14, color: "#666", marginTop: 12, marginBottom: 12, lineHeight: 1.5 }}>
                      {reference.description}
                    </p>
                    <a
                      href={reference.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: "#8B7BE8", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <LinkIcon size={12} />
                      Visit Website
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Learning Modal */}
      {showLearningModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 24,
          }}
          onClick={() => {
            setShowLearningModal(false);
            resetLearningForm();
          }}
        >
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: 32,
              maxWidth: 800,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 600, color: "#252525" }}>
                {editingLearning ? "Edit Learning" : "Add New Learning"}
              </h2>
              <Button
                onClick={() => {
                  setShowLearningModal(false);
                  resetLearningForm();
                }}
                style={{ background: "transparent", padding: 0 }}
              >
                <X size={24} color="#666" />
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>Title</label>
                <Input
                  value={learningForm.title}
                  onChange={(e) => setLearningForm({ ...learningForm, title: e.target.value })}
                  placeholder="e.g., Advanced React Patterns"
                  style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>Subtitle</label>
                <Input
                  value={learningForm.subtitle}
                  onChange={(e) => setLearningForm({ ...learningForm, subtitle: e.target.value })}
                  placeholder="e.g., Master advanced patterns in React"
                  style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>Category</label>
                  <Input
                    value={learningForm.category}
                    onChange={(e) => setLearningForm({ ...learningForm, category: e.target.value })}
                    placeholder="e.g., Web Development"
                    style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>Duration</label>
                  <Input
                    value={learningForm.duration}
                    onChange={(e) => setLearningForm({ ...learningForm, duration: e.target.value })}
                    placeholder="e.g., 8 hours"
                    style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>Image URL</label>
                <Input
                  value={learningForm.image}
                  onChange={(e) => setLearningForm({ ...learningForm, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                />
              </div>

              {/* Chapters Section */}
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#252525" }}>Chapters</h3>
                
                {learningForm.chapters.map((chapter, idx) => (
                  <Card key={idx} style={{ padding: 16, marginBottom: 12, background: "#F7F5FD", border: "1px solid #E1DEF6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600 }}>{chapter.title}</h4>
                      <Button
                        onClick={() => {
                          const newChapters = learningForm.chapters.filter((_, i) => i !== idx);
                          setLearningForm({ ...learningForm, chapters: newChapters });
                        }}
                        style={{ background: "transparent", padding: 0 }}
                      >
                        <Trash2 size={16} color="#FF6B6B" />
                      </Button>
                    </div>
                    <div style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>
                      <strong>Topics:</strong> {chapter.topics.join(", ")}
                    </div>
                    <div style={{ fontSize: 14, color: "#666" }}>
                      <strong>Resources:</strong> {chapter.resources.length}
                    </div>
                  </Card>
                ))}

                {/* Add New Chapter */}
                <Card style={{ padding: 16, background: "#FFF", border: "1px solid #E1DEF6" }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Add New Chapter</h4>
                  
                  <div style={{ marginBottom: 12 }}>
                    <Input
                      value={currentChapter.title}
                      onChange={(e) => setCurrentChapter({ ...currentChapter, title: e.target.value })}
                      placeholder="Chapter title"
                      style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                    />
                  </div>

                  {/* Topics */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: "block" }}>Topics</label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <Input
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        placeholder="Add a topic"
                        style={{ borderRadius: 8, border: "1px solid #E1DEF6", flex: 1 }}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTopic();
                          }
                        }}
                      />
                      <Button onClick={addTopic} style={{ background: "#8B7BE8", color: "white", padding: "8px 16px", borderRadius: 8 }}>
                        Add
                      </Button>
                    </div>
                    {currentChapter.topics.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {currentChapter.topics.map((topic, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: "#F5F5FF",
                              color: "#8B7BE8",
                              padding: "4px 12px",
                              borderRadius: 12,
                              fontSize: 12,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {topic}
                            <X
                              size={12}
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                const newTopics = currentChapter.topics.filter((_, i) => i !== idx);
                                setCurrentChapter({ ...currentChapter, topics: newTopics });
                              }}
                            />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resources */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: "block" }}>Resources</label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <Input
                        value={resourceInput.title}
                        onChange={(e) => setResourceInput({ ...resourceInput, title: e.target.value })}
                        placeholder="Resource title"
                        style={{ borderRadius: 8, border: "1px solid #E1DEF6", flex: 1 }}
                      />
                      <Input
                        value={resourceInput.url}
                        onChange={(e) => setResourceInput({ ...resourceInput, url: e.target.value })}
                        placeholder="URL"
                        style={{ borderRadius: 8, border: "1px solid #E1DEF6", flex: 1 }}
                      />
                      <select
                        value={resourceInput.type}
                        onChange={(e) => setResourceInput({ ...resourceInput, type: e.target.value })}
                        style={{ borderRadius: 8, border: "1px solid #E1DEF6", padding: "8px 12px" }}
                      >
                        <option value="article">Article</option>
                        <option value="video">Video</option>
                        <option value="documentation">Documentation</option>
                      </select>
                      <Button onClick={addResource} style={{ background: "#8B7BE8", color: "white", padding: "8px 16px", borderRadius: 8 }}>
                        Add
                      </Button>
                    </div>
                    {currentChapter.resources.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {currentChapter.resources.map((resource, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: "#F7F5FD",
                              padding: "8px 12px",
                              borderRadius: 8,
                              fontSize: 12,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span>
                              <strong>{resource.title}</strong> ({resource.type})
                            </span>
                            <X
                              size={12}
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                const newResources = currentChapter.resources.filter((_, i) => i !== idx);
                                setCurrentChapter({ ...currentChapter, resources: newResources });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button onClick={addChapter} style={{ background: "#4ECDC4", color: "white", padding: "8px 16px", borderRadius: 8, width: "100%" }}>
                    Add Chapter
                  </Button>
                </Card>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <Button
                  onClick={() => {
                    setShowLearningModal(false);
                    resetLearningForm();
                  }}
                  style={{ flex: 1, background: "#F5F5F5", color: "#666", padding: "12px", borderRadius: 8 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateLearning}
                  style={{ flex: 1, background: "#8B7BE8", color: "white", padding: "12px", borderRadius: 8 }}
                >
                  {editingLearning ? "Update" : "Create"} Learning
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reference Modal */}
      {showReferenceModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 24,
          }}
          onClick={() => {
            setShowReferenceModal(false);
            resetReferenceForm();
          }}
        >
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: 32,
              maxWidth: 600,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 600, color: "#252525" }}>
                {editingReference ? "Edit Reference" : "Add New Reference"}
              </h2>
              <Button
                onClick={() => {
                  setShowReferenceModal(false);
                  resetReferenceForm();
                }}
                style={{ background: "transparent", padding: 0 }}
              >
                <X size={24} color="#666" />
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>Title</label>
                <Input
                  value={referenceForm.title}
                  onChange={(e) => setReferenceForm({ ...referenceForm, title: e.target.value })}
                  placeholder="e.g., React Documentation"
                  style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>Category</label>
                <Input
                  value={referenceForm.category}
                  onChange={(e) => setReferenceForm({ ...referenceForm, category: e.target.value })}
                  placeholder="e.g., Documentation"
                  style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>Description</label>
                <Textarea
                  value={referenceForm.description}
                  onChange={(e) => setReferenceForm({ ...referenceForm, description: e.target.value })}
                  placeholder="Brief description of this reference"
                  rows={4}
                  style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>Website URL</label>
                <Input
                  value={referenceForm.url}
                  onChange={(e) => setReferenceForm({ ...referenceForm, url: e.target.value })}
                  placeholder="https://example.com"
                  style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", color: "#252525" }}>Image URL</label>
                <Input
                  value={referenceForm.image}
                  onChange={(e) => setReferenceForm({ ...referenceForm, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  style={{ borderRadius: 8, border: "1px solid #E1DEF6" }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <Button
                  onClick={() => {
                    setShowReferenceModal(false);
                    resetReferenceForm();
                  }}
                  style={{ flex: 1, background: "#F5F5F5", color: "#666", padding: "12px", borderRadius: 8 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateReference}
                  style={{ flex: 1, background: "#8B7BE8", color: "white", padding: "12px", borderRadius: 8 }}
                >
                  {editingReference ? "Update" : "Create"} Reference
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
