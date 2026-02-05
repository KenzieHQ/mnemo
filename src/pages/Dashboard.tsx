import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  HStack,
  VStack,
  useColorModeValue,
  Button,
  Progress,
} from '@chakra-ui/react';
import { 
  Flame, 
  CheckCircle2, 
  Target, 
  Clock,
  Play,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  useDecks, 
  useStreak, 
  useCardsMastered, 
  useRetentionRate, 
  useTodayStats,
  useTotalDueCount,
  useTotalCards,
} from '@/hooks/useData';

export default function Dashboard() {
  const navigate = useNavigate();
  const decks = useDecks();
  const streak = useStreak();
  const cardsMastered = useCardsMastered();
  const retentionRate = useRetentionRate(30);
  const todayStats = useTodayStats();
  const totalDue = useTotalDueCount();
  const totalCards = useTotalCards();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const subtleText = useColorModeValue('gray.600', 'gray.400');

  // Calculate meaningful helper text based on actual data
  const getStreakHelperText = () => {
    if (!streak || streak === 0) return 'Start studying to build a streak';
    if (streak === 1) return 'Keep it going!';
    if (streak >= 7) return 'Great consistency!';
    return 'Building momentum';
  };

  const getMasteredHelperText = () => {
    if (!cardsMastered || cardsMastered === 0) return 'Cards you\'ve mastered';
    if (!totalCards || totalCards === 0) return `${cardsMastered} mastered`;
    const percent = Math.round((cardsMastered / totalCards) * 100);
    return `${percent}% of your cards`;
  };

  const getRetentionHelperText = () => {
    if (!retentionRate || retentionRate === 0) return 'Based on recent reviews';
    if (retentionRate >= 90) return 'Excellent recall!';
    if (retentionRate >= 80) return 'Good retention';
    return 'Keep practicing';
  };

  const getTimeHelperText = () => {
    const mins = todayStats?.timeSpent ? Math.round(todayStats.timeSpent / 60000) : 0;
    if (mins === 0) return 'No study time today';
    return 'Today\'s study time';
  };

  const statsCards = [
    {
      label: 'Current Streak',
      value: `${streak ?? 0} Days`,
      helperText: getStreakHelperText(),
      icon: Flame,
      iconColor: 'orange.500',
    },
    {
      label: 'Cards Mastered',
      value: `${cardsMastered?.toLocaleString() ?? 0} Cards`,
      helperText: getMasteredHelperText(),
      icon: CheckCircle2,
      iconColor: 'blue.500',
    },
    {
      label: 'Retention Rate',
      value: `${retentionRate?.toFixed(1) ?? 0}%`,
      helperText: getRetentionHelperText(),
      icon: Target,
      iconColor: 'green.500',
    },
    {
      label: 'Study Time',
      value: `${todayStats?.timeSpent ? Math.round(todayStats.timeSpent / 60000) : 0} mins`,
      helperText: getTimeHelperText(),
      icon: Clock,
      iconColor: 'purple.500',
    },
  ];

  // Get decks with due cards
  const decksWithDue = decks?.filter(d => d.dueToday > 0).slice(0, 3) ?? [];

  return (
    <Box maxW="1400px" mx="auto">
      <Box mb={8}>
        <Heading size="lg" mb={2}>Dashboard</Heading>
        <Text color={subtleText}>
          Welcome back! You have {totalDue ?? 0} cards due for review today.
        </Text>
      </Box>

      {/* Stats Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        {statsCards.map((stat, index) => (
          <Card key={index} bg={cardBg} borderColor={borderColor} borderWidth="1px">
            <CardBody>
              <HStack justify="space-between" mb={2}>
                <Stat>
                  <StatLabel color={subtleText}>{stat.label}</StatLabel>
                  <StatNumber fontSize="2xl">{stat.value}</StatNumber>
                  <StatHelpText mb={0} color={subtleText}>
                    {stat.helperText}
                  </StatHelpText>
                </Stat>
                <Icon as={stat.icon} boxSize={6} color={stat.iconColor} />
              </HStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Quick Actions */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Due Today */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Due Today</Heading>
              <Button 
                size="sm" 
                colorScheme="blue"
                onClick={() => navigate('/decks')}
              >
                View All
              </Button>
            </HStack>
            
            {decksWithDue.length === 0 ? (
              <VStack py={8} spacing={3}>
                <Icon as={CheckCircle2} boxSize={12} color="green.500" />
                <Text color={subtleText}>All caught up! No cards due.</Text>
              </VStack>
            ) : (
              <VStack spacing={4} align="stretch">
                {decksWithDue.map((deck) => (
                  <Box 
                    key={deck.id} 
                    p={4} 
                    borderRadius="lg" 
                    borderWidth="1px"
                    borderColor={borderColor}
                  >
                    <HStack justify="space-between" mb={2}>
                      <HStack>
                        <Box
                          w={8}
                          h={8}
                          borderRadius="md"
                          bg={deck.color || 'blue.100'}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Icon as={Layers} boxSize={4} color="blue.600" />
                        </Box>
                        <Box>
                          <Text fontWeight="600">{deck.name}</Text>
                          <Text fontSize="sm" color={subtleText}>
                            {deck.dueToday} cards due
                          </Text>
                        </Box>
                      </HStack>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<Icon as={Play} boxSize={4} />}
                        onClick={() => navigate(`/study/${deck.id}`)}
                      >
                        Study
                      </Button>
                    </HStack>
                    <Progress 
                      value={deck.maturityPercent} 
                      size="sm" 
                      colorScheme="green" 
                      borderRadius="full"
                    />
                    <Text fontSize="xs" color={subtleText} mt={1}>
                      {deck.maturityPercent}% mature
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Quick Start */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Heading size="md" mb={4}>Quick Start</Heading>
            <VStack spacing={4} align="stretch">
              <Button
                size="lg"
                colorScheme="blue"
                leftIcon={<Icon as={Play} />}
                onClick={() => {
                  const firstDeck = decksWithDue[0] || decks?.[0];
                  if (firstDeck) navigate(`/study/${firstDeck.id}`);
                }}
                isDisabled={!decks?.length}
              >
                Start Study Session
              </Button>
              <Button
                size="lg"
                variant="outline"
                leftIcon={<Icon as={Layers} />}
                onClick={() => navigate('/decks')}
              >
                Manage Decks
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
