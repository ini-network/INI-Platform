"use client";

import { useState, useMemo } from "react";
import ProfileModal, { GraphNode, GraphLink, ContactProfile } from "@/components/ProfileModal";

interface MiniMapModalProps {
    initialContact: ContactProfile;
    allContacts: ContactProfile[];
    onClose: () => void;
    onSaveContact?: (id: string) => Promise<void>;
}

export default function MiniMapModal({
    initialContact,
    allContacts,
    onClose,
    onSaveContact
}: MiniMapModalProps) {
    const [microMapContact, setMicroMapContact] = useState<ContactProfile>(initialContact);
    const [inspectContact, setInspectContact] = useState<ContactProfile | null>(initialContact);
    
    // Compute initial expansion state
    const [isGraphExpanded, setIsGraphExpanded] = useState(() => {
        const connectedPeople = allContacts.filter(c => c.id !== initialContact.id && c.domains?.some(d => initialContact.domains?.includes(d)));
        return connectedPeople.length <= 15;
    });
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const launchMap = (person: ContactProfile) => {
        const connectedPeople = allContacts.filter(c => c.id !== person.id && c.domains?.some(d => person.domains?.includes(d)));
        setIsGraphExpanded(connectedPeople.length <= 15);
        setExpandedNodes(new Set());
        setMicroMapContact(person);
        setInspectContact(person);
    };

    const microGraphData = useMemo(() => {
        if (!microMapContact) return {nodes: [], links: [], hiddenCount: 0};

        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        const addedNodes = new Set<string>();
        const addedLinks = new Set<string>();
        let hiddenCount = 0;

        const createPersonTooltip = (c: ContactProfile, isCenter = false) => {
            const parts = [];
            if (c.campus) parts.push(`Locale: ${c.campus}`);
            if (c.affiliation) parts.push(`Affiliation: ${c.affiliation}`);
            const details = parts.length > 0 ? `<br/><span style="font-size: 11px; color: #cbd5e1; font-weight: normal;">${parts.join(' | ')}</span>` : '';
            const prefix = isCenter ? `<span style="display: block; font-size: 9px; color: #fbbf24; margin-bottom: 2px;">CENTER PROFILE</span>` : '';
            return `<div style="text-align: center; font-family: sans-serif; padding: 2px;">${prefix}<strong>${c.name}</strong>${details}</div>`;
        };

        const safeAddLink = (s: string, t: string) => {
            const key = `${s}->${t}`;
            const reverseKey = `${t}->${s}`;
            if (!addedLinks.has(key) && !addedLinks.has(reverseKey)) {
                addedLinks.add(key);
                links.push({source: s, target: t});
            }
        };

        // 1. Add Center Person
        nodes.push({
            id: microMapContact.id,
            name: microMapContact.name,
            group: "center",
            val: 12,
            color: "#fbbf24",
            title: createPersonTooltip(microMapContact, true)
        });
        addedNodes.add(microMapContact.id);

        const networkContacts = allContacts.filter(other =>
            other.id !== microMapContact.id &&
            other.domains?.some(d => microMapContact.domains?.includes(d))
        );
        const isSmallNetwork = networkContacts.length <= 15;

        microMapContact.domains?.forEach(topic => {
            if (!addedNodes.has(topic)) {
                nodes.push({
                    id: topic, name: topic, group: "topic_hub", val: 8, color: "#0ea5e9",
                    title: `<div style="text-align: center;"><strong>${topic}</strong><br/><span style="font-size: 10px; color: #94a3b8;">Interest Hub (Click to expand)</span></div>`
                });
                addedNodes.add(topic);
            }
            safeAddLink(microMapContact.id, topic);

            allContacts.forEach(other => {
                if (other.id === microMapContact.id || !other.domains?.includes(topic)) return;

                const shouldExpand = isGraphExpanded || expandedNodes.has(topic) || isSmallNetwork;

                if (shouldExpand) {
                    if (!addedNodes.has(other.id)) {
                        nodes.push({
                            id: other.id, name: other.name, group: "person", val: 5, color: "#ff0000",
                            title: createPersonTooltip(other)
                        });
                        addedNodes.add(other.id);
                    }
                    safeAddLink(topic, other.id);
                } else {
                    if (!addedNodes.has(other.id)) {
                        hiddenCount++;
                    }
                }
            });
        });

        const adjustedHiddenCount = Math.floor(hiddenCount / (microMapContact.domains?.length || 1));

        return {nodes, links, hiddenCount: adjustedHiddenCount};
    }, [allContacts, microMapContact, isGraphExpanded, expandedNodes]);

    if (!inspectContact) return null;

    return (
        <ProfileModal
            contact={inspectContact}
            onClose={onClose}
            showGraph={true}
            graphData={{nodes: microGraphData.nodes, links: microGraphData.links}}
            isGraphExpanded={isGraphExpanded}
            hiddenCount={microGraphData.hiddenCount}
            onToggleGraph={() => {
                setIsGraphExpanded(!isGraphExpanded);
                if (isGraphExpanded) setExpandedNodes(new Set());
            }}
            onNodeClick={(node) => {
                const nodeId = String(node.id);
                if (node.group === "person" || node.group === "center") {
                    const clickedPerson = allContacts.find((c) => c.id === nodeId);
                    if (clickedPerson) setInspectContact(clickedPerson);
                } else if (node.group === "topic_hub" || node.group === "location_hub") {
                    setExpandedNodes(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(nodeId)) newSet.delete(nodeId);
                        else newSet.add(nodeId);
                        return newSet;
                    });
                }
            }}
            onRecenter={(person) => launchMap(person as ContactProfile)}
            onSaveContact={onSaveContact}
        />
    );
}