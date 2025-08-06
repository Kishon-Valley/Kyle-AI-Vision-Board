import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { MoodBoard } from '../lib/moodboards';

const SharePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [moodBoard, setMoodBoard] = useState<MoodBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMoodBoard = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('mood_boards')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setMoodBoard(data);
      } catch (error) {
        console.error('Error fetching mood board:', error);
        // Stay on the page and let the UI show a not-found message instead of redirecting
        setMoodBoard(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoodBoard();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!moodBoard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Mood Board Not Found</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-8"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>

      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="aspect-video relative mb-6">
            <img
              src={moodBoard.image_url}
              alt={`${moodBoard.style} ${moodBoard.room_type} design`}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">
              {moodBoard.style} {moodBoard.room_type} Design
            </h1>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>
                {moodBoard.description}
              </ReactMarkdown>
            </div>
            <div className="flex flex-wrap gap-2">
              {moodBoard.color_palette?.map((color, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
                >
                  {color}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SharePage; 