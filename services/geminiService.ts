
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = (response: GenerateContentResponse): string => {
    for (const candidate of response.candidates ?? []) {
        for (const part of candidate.content?.parts ?? []) {
            if (part.inlineData) {
                const { mimeType, data } = part.inlineData;
                return `data:${mimeType};base64,${data}`;
            }
        }
    }
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        throw new Error(`Image generation stopped. Reason: ${finishReason}`);
    }
    const textFeedback = response.text?.trim();
    throw new Error(textFeedback || "AI did not return an image.");
};

export const removeBackground = async (imageSource: File | string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = typeof imageSource === 'string' ? dataUrlToPart(imageSource) : await fileToPart(imageSource);
    const prompt = "Remove the background from this photo, keeping only the person. Place the person on a solid pure white background (#FFFFFF). Ensure clean edges.";
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] },
    });
    return handleApiResponse(response);
};

export const generateModelImage = async (imageSource: File | string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const userImagePart = typeof imageSource === 'string' ? dataUrlToPart(imageSource) : await fileToPart(imageSource);
    const prompt = "Transform the person in this image into a photorealistic full-body fashion model photo in a neutral studio backdrop. Preserve the person's identity and body type.";
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [userImagePart, { text: prompt }] },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, itemImage: File): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const itemImagePart = await fileToPart(itemImage);
    const prompt = `You are an expert virtual try-on AI. You will be given a 'base image' of a model and an 'item image' (either clothing or an accessory like a hat, sunglasses, or bag).
    
Your task:
1. If the item is CLOTHING: Replace the current corresponding clothing on the model with the new one.
2. If the item is an ACCESSORY: Add the accessory to the model realistically (e.g., put the hat on the head, glasses on the face, or bag in the hand/on the shoulder).
3. Preserve the model's identity, pose, and background perfectly.
4. The item should look photorealistic and naturally fit the lighting and shadows of the scene.
5. Return ONLY the final image.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [modelImagePart, itemImagePart, { text: prompt }] },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `Regenerate this image from a new perspective/pose: "${poseInstruction}". The person, outfit, accessories, and background must remain identical. Return ONLY the image.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [tryOnImagePart, { text: prompt }] },
    });
    return handleApiResponse(response);
};

export const generateVideo = async (imageSource: string, modelName: string = 'veo-3.1-fast-generate-preview'): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { mimeType, data } = dataUrlToParts(imageSource);
    
    // Prompt tuning based on model
    const basePrompt = "Cinematic fashion clip. The model walks gracefully on a minimalist studio catwalk, showing off the outfit and accessories. Photorealistic, professional lighting.";
    const prompt = modelName.includes('fast') ? basePrompt : `${basePrompt} Extremely high detail, 4k cinematic resolution, buttery smooth motion, dramatic shadows.`;

    let operation = await ai.models.generateVideos({
        model: modelName as any,
        prompt,
        image: { imageBytes: data, mimeType: mimeType },
        config: { 
            numberOfVideos: 1, 
            resolution: modelName.includes('fast') ? '720p' : '1080p', 
            aspectRatio: '9:16' 
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};
