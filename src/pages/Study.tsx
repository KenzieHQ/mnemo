import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Button,
  HStack,
  VStack,
  Icon,
  Card,
  CardBody,
  Progress,
  IconButton,
  Flex,
  useToast,
  Badge,
  Kbd,
  Tooltip,
} from '@chakra-ui/react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Clock,
  Shuffle,
  Maximize2,
  Minimize2,
  Volume2,
  Timer,
  Pause,
} from 'lucide-react';
import { useDeckWithStats, useSettings } from '@/hooks/useData';
import { db, getDueCards, getNewCards, updateTodayStats } from '@/db/database';
import { 
  scheduleCard, 
  getNextIntervals, 
  buildStudyQueue, 
  getReinsertPosition 
} from '@/lib/spaced-repetition';
import { parseClozeForDisplay, type ClozePart } from '@/lib/card-utils';
import type { StudyCard, Rating, CardCustomization } from '@/types';
import { DEFAULT_CARD_CUSTOMIZATION } from '@/types';
import { isAddOnEnabled, getAddOnSettings, speakText, stopSpeaking } from './AddOns';

// Helper function to get customization style values
const getCustomizationStyles = (customization: CardCustomization) => {
  const fontSizeMap = {
    'small': '14px',
    'medium': '16px',
    'large': '18px',
    'x-large': '20px',
  };
  
  const lineSpacingMap = {
    'compact': 1.2,
    'normal': 1.5,
    'relaxed': 1.8,
    'spacious': 2.0,
  };
  
  const paddingMap = {
    'compact': 4,
    'normal': 6,
    'spacious': 8,
  };
  
  return {
    fontSize: fontSizeMap[customization.fontSize],
    lineHeight: lineSpacingMap[customization.lineSpacing],
    padding: paddingMap[customization.cardPadding],
    cardBgColor: customization.cardBgColor,
    clozeBgColor: customization.clozeBgColor,
    clozeTextColor: customization.clozeTextColor,
  };
};

export default function Study() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  const deck = useDeckWithStats(deckId);
  const settings = useSettings();
  
  // Get card customization from settings
  const customization = settings?.cardCustomization ?? DEFAULT_CARD_CUSTOMIZATION;
  const customStyles = getCustomizationStyles(customization);
  
  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    newLearned: 0,
    startTime: Date.now(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [cardStartTime, setCardStartTime] = useState(Date.now());

  // Pomodoro timer state
  const [pomodoroTime, setPomodoroTime] = useState(0);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [isBreakTime, setIsBreakTime] = useState(false);
  const pomodoroEnabled = isAddOnEnabled('pomodoro-timer');
  const ttsEnabled = isAddOnEnabled('text-to-speech');
  const pomodoroIntervalRef = useRef<number | null>(null);

  const cardBg = 'white';
  const borderColor = 'gray.200';
  const subtleText = 'gray.600';
  const revealedBg = 'green.100';
  const revealedColor = 'green.700';

  // Fisher-Yates shuffle algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Load study queue
  useEffect(() => {
    async function loadQueue() {
      if (!deckId || !settings) return;
      
      setIsLoading(true);
      
      const dueCards = await getDueCards(deckId);
      const newCards = await getNewCards(deckId, deck?.newCardsPerDay ?? settings.defaultNewCardsPerDay);
      
      let studyQueue = buildStudyQueue(
        dueCards,
        newCards,
        deck?.newCardsPerDay ?? settings.defaultNewCardsPerDay
      );
      
      // Apply shuffle if enabled
      if (isShuffled) {
        studyQueue = shuffleArray(studyQueue);
      }
      
      setQueue(studyQueue);
      setCurrentIndex(0);
      setShowAnswer(false);
      setCardStartTime(Date.now());
      setIsLoading(false);
    }
    
    loadQueue();
  }, [deckId, settings, deck?.newCardsPerDay, isShuffled]);

  // Handle shuffle toggle
  const handleShuffleToggle = () => {
    setIsShuffled(!isShuffled);
  };

  const currentCard = queue[currentIndex];
  const progress = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0;
  const remaining = queue.length - currentIndex;

  // Get next intervals for rating buttons
  const nextIntervals = currentCard && settings
    ? getNextIntervals(currentCard, settings)
    : { again: '', hard: '', good: '', easy: '' };

  const handleRating = useCallback(async (rating: Rating) => {
    if (!currentCard || !settings) return;

    const timeTaken = Date.now() - cardStartTime;
    
    // Schedule the card
    const result = scheduleCard(currentCard, rating, settings);
    
    // Update the card in database
    await db.cards.update(currentCard.id, {
      ...result.card,
      nextReview: result.nextReview,
    });

    // Log the review
    await db.reviewLogs.add({
      id: crypto.randomUUID(),
      cardId: currentCard.id,
      deckId: currentCard.deckId,
      rating,
      interval: result.card.interval,
      easeFactor: result.card.easeFactor,
      reviewedAt: Date.now(),
      timeTaken,
    });

    // Update session stats
    const isCorrect = rating !== 'again';
    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      newLearned: prev.newLearned + (currentCard.isNew ? 1 : 0),
    }));

    // Handle "Again" - reinsert card later in queue
    if (rating === 'again') {
      const newQueue = [...queue];
      const reinsertPos = Math.min(
        currentIndex + getReinsertPosition(remaining),
        queue.length
      );
      
      // Update the card with new state
      const updatedCard: StudyCard = {
        ...result.card,
        nextReview: result.nextReview,
        isNew: false,
      };
      
      newQueue.splice(reinsertPos, 0, updatedCard);
      setQueue(newQueue);
    }

    // Move to next card
    if (currentIndex + 1 < queue.length) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setCardStartTime(Date.now());
    } else {
      // Session complete
      await finishSession();
    }
  }, [currentCard, settings, cardStartTime, queue, currentIndex, remaining]);

  const finishSession = async () => {
    const timeSpent = Date.now() - sessionStats.startTime;
    
    await updateTodayStats({
      cardsReviewed: sessionStats.reviewed,
      cardsCorrect: sessionStats.correct,
      newCardsStudied: sessionStats.newLearned,
      timeSpent,
    });

    toast({
      title: 'Session Complete!',
      description: `Reviewed ${sessionStats.reviewed} cards with ${Math.round((sessionStats.correct / sessionStats.reviewed) * 100)}% accuracy`,
      status: 'success',
      duration: 5000,
    });

    navigate(`/decks/${deckId}`);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Fullscreen toggle with 'f' key, exit with Escape
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
        return;
      }

      if (!showAnswer) {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          setShowAnswer(true);
        }
      } else {
        switch (e.key) {
          case '1':
            handleRating('again');
            break;
          case '2':
            handleRating('hard');
            break;
          case '3':
            handleRating('good');
            break;
          case '4':
            handleRating('easy');
            break;
          case ' ':
            e.preventDefault();
            handleRating('good');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, handleRating, isFullscreen, toggleFullscreen]);

  // Pomodoro timer effect
  useEffect(() => {
    if (!pomodoroEnabled) return;

    const addonSettings = getAddOnSettings();
    const workSeconds = addonSettings.pomodoroWorkMinutes * 60;
    const breakSeconds = addonSettings.pomodoroBreakMinutes * 60;

    // Auto-start if enabled
    if (addonSettings.pomodoroAutoStart && !pomodoroRunning && pomodoroTime === 0) {
      setPomodoroTime(workSeconds);
      setPomodoroRunning(true);
    }

    if (pomodoroRunning) {
      pomodoroIntervalRef.current = window.setInterval(() => {
        setPomodoroTime(prev => {
          if (prev <= 1) {
            // Timer ended
            setPomodoroRunning(false);
            if (isBreakTime) {
              // Break ended, start work
              setIsBreakTime(false);
              toast({
                title: 'Break Over!',
                description: 'Time to get back to studying',
                status: 'info',
                duration: 5000,
              });
              return workSeconds;
            } else {
              // Work ended, start break
              setIsBreakTime(true);
              toast({
                title: 'Time for a Break!',
                description: `Take a ${addonSettings.pomodoroBreakMinutes} minute break`,
                status: 'success',
                duration: 5000,
              });
              return breakSeconds;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    };
  }, [pomodoroEnabled, pomodoroRunning, isBreakTime, pomodoroTime, toast]);

  // TTS: Speak answer when revealed (if auto-play enabled)
  useEffect(() => {
    if (!ttsEnabled || !showAnswer || !currentCard) return;
    
    const addonSettings = getAddOnSettings();
    if (addonSettings.ttsAutoPlay) {
      const textToSpeak = currentCard.type === 'cloze' 
        ? currentCard.back.replace(/\{\{c\d+::([^}]+)\}\}/g, '$1')
        : currentCard.back;
      speakText(textToSpeak);
    }

    return () => {
      stopSpeaking();
    };
  }, [showAnswer, currentCard, ttsEnabled]);

  // Format pomodoro time for display
  const formatPomodoroTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle pomodoro timer
  const togglePomodoro = () => {
    if (pomodoroRunning) {
      setPomodoroRunning(false);
    } else {
      if (pomodoroTime === 0) {
        const addonSettings = getAddOnSettings();
        setPomodoroTime(addonSettings.pomodoroWorkMinutes * 60);
      }
      setPomodoroRunning(true);
    }
  };

  // Speak current card content
  const handleSpeak = () => {
    if (!currentCard) return;
    const textToSpeak = showAnswer 
      ? (currentCard.type === 'cloze' 
          ? currentCard.back.replace(/\{\{c\d+::([^}]+)\}\}/g, '$1')
          : currentCard.back)
      : currentCard.front.replace(/\{\{c\d+::([^}]+)\}\}/g, '...');
    speakText(textToSpeak);
  };

  // Render cloze part with styling
  const renderClozePart = (part: ClozePart, index: number) => {
    switch (part.type) {
      case 'blank':
        return (
          <Box
            key={index}
            as="span"
            display="inline-block"
            bg={customStyles.clozeBgColor}
            color={customStyles.clozeTextColor}
            px={2}
            py={0.5}
            mx={0.5}
            borderRadius="md"
            fontWeight="600"
          >
            [{part.content}]
          </Box>
        );
      case 'revealed':
        return (
          <Box
            key={index}
            as="span"
            display="inline-block"
            bg={revealedBg}
            color={revealedColor}
            px={2}
            py={0.5}
            mx={0.5}
            borderRadius="md"
            fontWeight="700"
          >
            {part.content}
          </Box>
        );
      default:
        return <span key={index}>{part.content}</span>;
    }
  };

  // Render card content
  const renderCardContent = (side: 'front' | 'back') => {
    if (!currentCard) return null;

    if (currentCard.type === 'cloze' && currentCard.clozeIndex) {
      const isAnswer = side === 'back';
      const parts = parseClozeForDisplay(currentCard.front, currentCard.clozeIndex, isAnswer);
      return parts.map((part, index) => renderClozePart(part, index));
    }

    return side === 'front' ? currentCard.front : currentCard.back;
  };

  if (isLoading) {
    return (
      <Box maxW="800px" mx="auto" textAlign="center" py={20}>
        <Text color={subtleText}>Loading study session...</Text>
      </Box>
    );
  }

  if (!deck) {
    return (
      <Box maxW="800px" mx="auto" textAlign="center" py={20}>
        <Text color={subtleText}>Deck not found</Text>
        <Button mt={4} onClick={() => navigate('/decks')}>
          Back to Decks
        </Button>
      </Box>
    );
  }

  if (queue.length === 0) {
    return (
      <Box maxW="800px" mx="auto" textAlign="center" py={20}>
        <Icon as={CheckCircle2} boxSize={16} color="green.500" mb={4} />
        <Heading size="lg" mb={2}>All Caught Up!</Heading>
        <Text color={subtleText} mb={6}>
          No cards due for review in this deck.
        </Text>
        <HStack justify="center" spacing={4}>
          <Button variant="outline" onClick={() => navigate(`/decks/${deckId}`)}>
            Back to Deck
          </Button>
          <Button colorScheme="blue" onClick={() => navigate('/decks')}>
            Choose Another Deck
          </Button>
        </HStack>
      </Box>
    );
  }

  // Session complete
  if (currentIndex >= queue.length) {
    return (
      <Box maxW="800px" mx="auto" textAlign="center" py={20}>
        <Icon as={CheckCircle2} boxSize={16} color="green.500" mb={4} />
        <Heading size="lg" mb={2}>Session Complete!</Heading>
        <Text color={subtleText} mb={6}>
          Great work! You reviewed {sessionStats.reviewed} cards.
        </Text>
        <VStack spacing={2} mb={6}>
          <HStack>
            <Text>Accuracy:</Text>
            <Badge colorScheme="green" fontSize="lg">
              {Math.round((sessionStats.correct / sessionStats.reviewed) * 100)}%
            </Badge>
          </HStack>
          <HStack>
            <Text>New cards learned:</Text>
            <Badge colorScheme="blue" fontSize="lg">
              {sessionStats.newLearned}
            </Badge>
          </HStack>
        </VStack>
        <Button colorScheme="blue" onClick={() => navigate(`/decks/${deckId}`)}>
          Back to Deck
        </Button>
      </Box>
    );
  }

  return (
    <Box 
      maxW={isFullscreen ? "100%" : "800px"} 
      mx="auto"
      {...(isFullscreen && {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        bg: cardBg,
        p: 8,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      })}
    >
      {/* Fullscreen inner container */}
      <Box maxW="900px" mx="auto" w="100%" flex={isFullscreen ? 1 : undefined}>
        {/* Header */}
        <HStack mb={6}>
          {!isFullscreen && (
            <IconButton
              aria-label="Back"
              icon={<Icon as={ArrowLeft} />}
              variant="ghost"
              onClick={() => navigate(`/decks/${deckId}`)}
            />
          )}
          <Box flex={1}>
            <Heading size="md">{deck.name}</Heading>
            <Text fontSize="sm" color={subtleText}>
              {remaining} cards remaining
            </Text>
          </Box>
          <HStack spacing={3}>
            {/* Pomodoro Timer */}
            {pomodoroEnabled && (
              <Tooltip label={pomodoroRunning ? 'Pause timer' : 'Start Pomodoro timer'}>
                <Button
                  size="sm"
                  variant={pomodoroRunning ? 'solid' : 'ghost'}
                  colorScheme={isBreakTime ? 'green' : pomodoroRunning ? 'orange' : 'gray'}
                  leftIcon={<Icon as={pomodoroRunning ? Pause : Timer} boxSize={4} />}
                  onClick={togglePomodoro}
                >
                  {pomodoroTime > 0 ? formatPomodoroTime(pomodoroTime) : 'Timer'}
                </Button>
              </Tooltip>
            )}
            {/* Text-to-Speech */}
            {ttsEnabled && (
              <Tooltip label="Read card aloud">
                <IconButton
                  aria-label="Read aloud"
                  icon={<Icon as={Volume2} boxSize={4} />}
                  size="sm"
                  variant="ghost"
                  onClick={handleSpeak}
                />
              </Tooltip>
            )}
            <Tooltip label={isShuffled ? 'Cards are shuffled' : 'Shuffle cards'}>
              <Button
                size="sm"
                variant={isShuffled ? 'solid' : 'ghost'}
                colorScheme={isShuffled ? 'purple' : 'gray'}
                leftIcon={<Icon as={Shuffle} boxSize={4} />}
                onClick={handleShuffleToggle}
              >
                Shuffle
              </Button>
            </Tooltip>
            <Tooltip label={isFullscreen ? 'Exit fullscreen (F or Esc)' : 'Fullscreen mode (F)'}>
              <IconButton
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                icon={<Icon as={isFullscreen ? Minimize2 : Maximize2} boxSize={4} />}
                size="sm"
                variant="ghost"
                onClick={toggleFullscreen}
              />
            </Tooltip>
            {currentCard.isNew ? (
              <Badge colorScheme="blue">NEW</Badge>
            ) : (
              <Badge colorScheme="gray">
                {currentCard.learningState}
              </Badge>
            )}
          </HStack>
        </HStack>

      {/* Progress */}
      <Progress 
        value={progress} 
        size="sm" 
        colorScheme="blue" 
        borderRadius="full" 
        mb={6}
      />

      {/* Card */}
      <Card 
        bg={customStyles.cardBgColor} 
        borderWidth="1px" 
        borderColor={borderColor}
        minH="400px"
        mb={6}
      >
        <CardBody display="flex" flexDirection="column" p={customStyles.padding}>
          {/* Question */}
          <VStack flex={1} justify="center" spacing={6} py={8}>
            <Text 
              fontSize={customStyles.fontSize} 
              lineHeight={customStyles.lineHeight}
              fontWeight="500" 
              textAlign="center"
              whiteSpace="pre-wrap"
            >
              {renderCardContent('front')}
            </Text>

            {showAnswer && (
              <>
                <Box w="full" h="1px" bg={borderColor} />
                <Text 
                  fontSize={customStyles.fontSize} 
                  lineHeight={customStyles.lineHeight}
                  textAlign="center"
                  whiteSpace="pre-wrap"
                  color="green.500"
                  fontWeight="600"
                >
                  {renderCardContent('back')}
                </Text>
              </>
            )}
          </VStack>

          {/* Actions */}
          {!showAnswer ? (
            <Flex justify="center" mt="auto">
              <Button
                size="lg"
                colorScheme="blue"
                leftIcon={<Icon as={Eye} />}
                onClick={() => setShowAnswer(true)}
              >
                Show Answer
              </Button>
            </Flex>
          ) : (
            <VStack spacing={4} mt="auto">
              <HStack spacing={4} w="full" justify="center" flexWrap="wrap">
                <Button
                  flex="1"
                  maxW="140px"
                  colorScheme="red"
                  variant="outline"
                  onClick={() => handleRating('again')}
                >
                  <VStack spacing={0}>
                    <Text>Again</Text>
                    <Text fontSize="xs" opacity={0.7}>{nextIntervals.again}</Text>
                  </VStack>
                </Button>
                <Button
                  flex="1"
                  maxW="140px"
                  colorScheme="orange"
                  variant="outline"
                  onClick={() => handleRating('hard')}
                >
                  <VStack spacing={0}>
                    <Text>Hard</Text>
                    <Text fontSize="xs" opacity={0.7}>{nextIntervals.hard}</Text>
                  </VStack>
                </Button>
                <Button
                  flex="1"
                  maxW="140px"
                  colorScheme="green"
                  onClick={() => handleRating('good')}
                >
                  <VStack spacing={0}>
                    <Text>Good</Text>
                    <Text fontSize="xs" opacity={0.7}>{nextIntervals.good}</Text>
                  </VStack>
                </Button>
                <Button
                  flex="1"
                  maxW="140px"
                  colorScheme="blue"
                  onClick={() => handleRating('easy')}
                >
                  <VStack spacing={0}>
                    <Text>Easy</Text>
                    <Text fontSize="xs" opacity={0.7}>{nextIntervals.easy}</Text>
                  </VStack>
                </Button>
              </HStack>
              
              <HStack spacing={4} color={subtleText} fontSize="sm">
                <HStack><Kbd>1</Kbd><Text>Again</Text></HStack>
                <HStack><Kbd>2</Kbd><Text>Hard</Text></HStack>
                <HStack><Kbd>3</Kbd><Text>Good</Text></HStack>
                <HStack><Kbd>4</Kbd><Text>Easy</Text></HStack>
              </HStack>
            </VStack>
          )}
        </CardBody>
      </Card>

      {/* Session Stats */}
      <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
        <CardBody>
          <HStack justify="space-around">
            <VStack spacing={0}>
              <Text fontSize="2xl" fontWeight="bold">{sessionStats.reviewed}</Text>
              <Text fontSize="sm" color={subtleText}>Reviewed</Text>
            </VStack>
            <VStack spacing={0}>
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                {sessionStats.reviewed > 0 
                  ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) 
                  : 0}%
              </Text>
              <Text fontSize="sm" color={subtleText}>Accuracy</Text>
            </VStack>
            <VStack spacing={0}>
              <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                {sessionStats.newLearned}
              </Text>
              <Text fontSize="sm" color={subtleText}>New</Text>
            </VStack>
            <VStack spacing={0}>
              <HStack>
                <Icon as={Clock} boxSize={5} />
                <Text fontSize="2xl" fontWeight="bold">
                  {Math.round((Date.now() - sessionStats.startTime) / 60000)}m
                </Text>
              </HStack>
              <Text fontSize="sm" color={subtleText}>Time</Text>
            </VStack>
          </HStack>
        </CardBody>
      </Card>
      </Box>
    </Box>
  );
}
