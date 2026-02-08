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
  Select,
  Button,
  Progress,
  Flex,
  Center,
  Tooltip,
} from '@chakra-ui/react';
import { 
  Flame, 
  CheckCircle2, 
  Target, 
  Clock,
  Download,
  TrendingUp,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useStreak, 
  useCardsMastered, 
  useRetentionRate, 
  useTodayStats,
  useDailyStats,
  useCardMaturity,
  useTotalCards,
} from '@/hooks/useData';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { isAddOnEnabled } from './AddOns';

export default function Statistics() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<number>(30);
  
  const streak = useStreak();
  const cardsMastered = useCardsMastered();
  const retentionRate = useRetentionRate(dateRange);
  const todayStats = useTodayStats();
  const dailyStats = useDailyStats(7);
  const cardMaturity = useCardMaturity();
  const totalCards = useTotalCards();

  // Check if user has any study history
  const hasStudyHistory = useLiveQuery(async () => {
    const reviewLogs = await db.reviewLogs.count();
    const sessions = await db.sessions.count();
    return reviewLogs > 0 || sessions > 0;
  });

  const cardBg = 'white';
  const borderColor = 'gray.200';
  const subtleText = 'gray.600';

  // Check if this is a new user with no data
  const isNewUser = totalCards === 0 || totalCards === undefined;
  const hasNoActivity = !hasStudyHistory && (streak === 0 || streak === undefined);

  // Empty state for new users
  if (isNewUser || hasNoActivity) {
    return (
      <Box maxW="1400px" mx="auto">
        {/* Header */}
        <Box mb={6}>
          <Heading size="lg" mb={2}>Learning Analytics</Heading>
          <Text color={subtleText}>
            Detailed insight into your memory retention and deck performance.
          </Text>
        </Box>

        {/* Empty State */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Center py={16}>
              <VStack spacing={6} textAlign="center" maxW="400px">
                <Box
                  p={4}
                  bg="blue.50"
                  borderRadius="full"
                >
                  <Icon as={BarChart3} boxSize={12} color="blue.500" />
                </Box>
                <VStack spacing={2}>
                  <Heading size="md">No Study Data Yet</Heading>
                  <Text color={subtleText}>
                    Start studying your flashcards to see detailed analytics about your learning progress, 
                    retention rate, and study streaks.
                  </Text>
                </VStack>
                <HStack spacing={4}>
                  {totalCards === 0 ? (
                    <Button
                      colorScheme="blue"
                      onClick={() => navigate('/decks')}
                    >
                      Create Your First Deck
                    </Button>
                  ) : (
                    <Button
                      colorScheme="blue"
                      onClick={() => navigate('/decks')}
                    >
                      Start Studying
                    </Button>
                  )}
                </HStack>
                <VStack spacing={1} pt={4}>
                  <Text fontSize="sm" color={subtleText}>
                    Statistics will appear after you:
                  </Text>
                  <Text fontSize="sm" color={subtleText}>
                    • Review at least one flashcard
                  </Text>
                  <Text fontSize="sm" color={subtleText}>
                    • Complete a study session
                  </Text>
                </VStack>
              </VStack>
            </Center>
          </CardBody>
        </Card>
      </Box>
    );
  }

  // Calculate weekly average
  const weeklyAverage = dailyStats && dailyStats.length > 0
    ? Math.round(dailyStats.reduce((sum, s) => sum + s.timeSpent, 0) / (7 * 60000))
    : 0;

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

  const getDailyAverageHelperText = () => {
    if (!dailyStats || dailyStats.length === 0) return 'No data yet';
    const daysWithActivity = dailyStats.filter(s => s.timeSpent > 0).length;
    if (daysWithActivity === 0) return 'No study time recorded';
    return `Over ${daysWithActivity} day${daysWithActivity !== 1 ? 's' : ''} with activity`;
  };

  // Stats cards
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
      label: 'Daily Average',
      value: `${weeklyAverage} mins`,
      helperText: getDailyAverageHelperText(),
      icon: Clock,
      iconColor: 'purple.500',
    },
  ];

  // Calculate maturity percentages
  const maturePercent = totalCards && cardMaturity 
    ? Math.round((cardMaturity.mature / totalCards) * 100) 
    : 0;
  const learningPercent = totalCards && cardMaturity 
    ? Math.round((cardMaturity.learning / totalCards) * 100) 
    : 0;
  const newPercent = totalCards && cardMaturity 
    ? Math.round((cardMaturity.new / totalCards) * 100) 
    : 0;

  // Get max reviews for chart scaling
  const maxReviews = dailyStats 
    ? Math.max(...dailyStats.map(s => s.cardsReviewed), 1)
    : 1;

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Box maxW="1400px" mx="auto">
      {/* Header */}
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg" mb={2}>Learning Analytics</Heading>
          <Text color={subtleText}>
            Detailed insight into your memory retention and deck performance.
          </Text>
        </Box>
        <HStack>
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            maxW="150px"
            bg={cardBg}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </Select>
          <Button
            leftIcon={<Icon as={Download} />}
            variant="outline"
          >
            Download Report
          </Button>
        </HStack>
      </HStack>

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

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={8}>
        {/* Reviews per Day Chart */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <HStack justify="space-between" mb={6}>
              <Heading size="md">Reviews per Day</Heading>
              <Select size="sm" maxW="120px" defaultValue="7">
                <option value="7">Last 7 Days</option>
              </Select>
            </HStack>
            
            <Box h="200px" position="relative">
              <Flex h="full" align="flex-end" justify="space-around" gap={2}>
                {dayNames.map((day, index) => {
                  const stat = dailyStats?.[index];
                  const height = stat 
                    ? `${(stat.cardsReviewed / maxReviews) * 100}%` 
                    : '0%';
                  
                  return (
                    <VStack key={day} flex={1} h="full" justify="flex-end">
                      <Box
                        w="full"
                        maxW="40px"
                        h={height}
                        minH="4px"
                        bg="blue.500"
                        borderRadius="md"
                        transition="all 0.3s"
                      />
                      <Text fontSize="xs" color={subtleText}>{day}</Text>
                    </VStack>
                  );
                })}
              </Flex>
            </Box>
          </CardBody>
        </Card>

        {/* Card Maturity */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Heading size="md" mb={6}>Card Maturity</Heading>
            
            <Flex justify="center" mb={6}>
              <Box position="relative" w="180px" h="180px">
                {/* Donut chart visualization */}
                <Box
                  position="absolute"
                  inset={0}
                  borderRadius="full"
                  bg={`conic-gradient(
                    #48BB78 0% ${maturePercent}%, 
                    #4299E1 ${maturePercent}% ${maturePercent + learningPercent}%, 
                    #EDF2F7 ${maturePercent + learningPercent}% 100%
                  )`}
                />
                <Box
                  position="absolute"
                  inset="25%"
                  borderRadius="full"
                  bg={cardBg}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexDirection="column"
                >
                  <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                    {totalCards?.toLocaleString() ?? 0}
                  </Text>
                  <Text fontSize="xs" color={subtleText}>TOTAL CARDS</Text>
                </Box>
              </Box>
            </Flex>

            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <HStack>
                  <Box w={3} h={3} borderRadius="full" bg="green.500" />
                  <Text>Mature</Text>
                </HStack>
                <Text fontWeight="600">{maturePercent}%</Text>
              </HStack>
              <HStack justify="space-between">
                <HStack>
                  <Box w={3} h={3} borderRadius="full" bg="blue.500" />
                  <Text>Learning</Text>
                </HStack>
                <Text fontWeight="600">{learningPercent}%</Text>
              </HStack>
              <HStack justify="space-between">
                <HStack>
                  <Box w={3} h={3} borderRadius="full" bg="gray.200" />
                  <Text>New</Text>
                </HStack>
                <Text fontWeight="600">{newPercent}%</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Retention Rate */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardBody>
          <Heading size="md" mb={2}>Retention Rate</Heading>
          <Text color={subtleText} mb={6}>
            Percentage of cards remembered after review.
          </Text>
          
          <Box position="relative" h="150px" mb={4}>
            {/* Simplified area chart representation */}
            <Box
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              h="80%"
              bg="linear-gradient(to top, rgba(66, 153, 225, 0.2), rgba(66, 153, 225, 0.05))"
              borderTopRadius="xl"
            />
            <Box
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              h="2px"
              bg="blue.500"
            />
            {/* Goal line */}
            <Box
              position="absolute"
              bottom="90%"
              left={0}
              right={0}
              h="2px"
              bg="red.300"
              borderStyle="dashed"
            />
            <Text
              position="absolute"
              right={0}
              top="5%"
              fontSize="xs"
              color="red.500"
            >
              Goal (90%)
            </Text>
          </Box>

          <HStack justify="space-between">
            <VStack align="start" spacing={0}>
              <Text fontSize="3xl" fontWeight="bold" color="blue.500">
                {retentionRate?.toFixed(1) ?? 0}%
              </Text>
              <Text fontSize="sm" color={subtleText}>Current retention</Text>
            </VStack>
            <VStack align="end" spacing={0}>
              <HStack color="green.500">
                <Icon as={TrendingUp} />
                <Text fontWeight="600">+2.3%</Text>
              </HStack>
              <Text fontSize="sm" color={subtleText}>vs last period</Text>
            </VStack>
          </HStack>
        </CardBody>
      </Card>

      {/* Today's Activity */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mt={8}>
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <HStack mb={4}>
              <Icon as={Calendar} color="blue.500" />
              <Heading size="md">Today's Activity</Heading>
            </HStack>
            
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Text>Cards Reviewed</Text>
                <Text fontWeight="bold">{todayStats?.cardsReviewed ?? 0}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Correct Answers</Text>
                <Text fontWeight="bold" color="green.500">
                  {todayStats?.cardsCorrect ?? 0}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text>New Cards Studied</Text>
                <Text fontWeight="bold" color="blue.500">
                  {todayStats?.newCardsStudied ?? 0}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text>Time Spent</Text>
                <Text fontWeight="bold">
                  {todayStats?.timeSpent 
                    ? `${Math.round(todayStats.timeSpent / 60000)} mins`
                    : '0 mins'}
                </Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Heading size="md" mb={4}>Study Goals</Heading>
            
            <VStack spacing={4} align="stretch">
              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm">Daily Reviews</Text>
                  <Text fontSize="sm" fontWeight="600">
                    {todayStats?.cardsReviewed ?? 0} / 200
                  </Text>
                </HStack>
                <Progress 
                  value={((todayStats?.cardsReviewed ?? 0) / 200) * 100} 
                  size="sm" 
                  colorScheme="blue"
                  borderRadius="full"
                />
              </Box>
              
              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm">New Cards</Text>
                  <Text fontSize="sm" fontWeight="600">
                    {todayStats?.newCardsStudied ?? 0} / 20
                  </Text>
                </HStack>
                <Progress 
                  value={((todayStats?.newCardsStudied ?? 0) / 20) * 100} 
                  size="sm" 
                  colorScheme="green"
                  borderRadius="full"
                />
              </Box>

              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm">Retention Target</Text>
                  <Text fontSize="sm" fontWeight="600">
                    {retentionRate?.toFixed(1) ?? 0}% / 90%
                  </Text>
                </HStack>
                <Progress 
                  value={retentionRate ? Math.min((retentionRate / 90) * 100, 100) : 0} 
                  size="sm" 
                  colorScheme={retentionRate && retentionRate >= 90 ? 'green' : 'orange'}
                  borderRadius="full"
                />
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Study Heatmap - Only show when add-on is enabled */}
      {isAddOnEnabled('study-heatmap') && <StudyHeatmap />}
    </Box>
  );
}

// Study Heatmap Component
function StudyHeatmap() {
  const cardBg = 'white';
  const borderColor = 'gray.200';
  
  // Get review logs for the past year
  const reviewLogs = useLiveQuery(async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return db.reviewLogs.where('reviewedAt').above(oneYearAgo).toArray();
  }, []);

  // Generate heatmap data
  const heatmapData = useMemo(() => {
    const data: Map<string, number> = new Map();
    
    // Initialize all days in the past year with 0
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      data.set(dateStr, 0);
    }
    
    // Count reviews per day
    if (reviewLogs) {
      reviewLogs.forEach(log => {
        const dateStr = new Date(log.reviewedAt).toISOString().split('T')[0];
        data.set(dateStr, (data.get(dateStr) || 0) + 1);
      });
    }
    
    return data;
  }, [reviewLogs]);

  // Get color based on review count
  const getColor = (count: number): string => {
    if (count === 0) return '#ebedf0';
    if (count <= 5) return '#9be9a8';
    if (count <= 15) return '#40c463';
    if (count <= 30) return '#30a14e';
    return '#216e39';
  };

  // Generate weeks for display (last 52 weeks)
  const weeks = useMemo(() => {
    const result: { date: Date; dateStr: string; count: number }[][] = [];
    const today = new Date();
    
    // Start from the beginning of the current week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Go back 52 weeks
    for (let week = 51; week >= 0; week--) {
      const weekData: { date: Date; dateStr: string; count: number }[] = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() - (week * 7) + day);
        const dateStr = date.toISOString().split('T')[0];
        weekData.push({
          date,
          dateStr,
          count: heatmapData.get(dateStr) || 0,
        });
      }
      result.push(weekData);
    }
    
    return result;
  }, [heatmapData]);

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastMonth = -1;
    
    weeks.forEach((week, index) => {
      const month = week[0].date.getMonth();
      if (month !== lastMonth) {
        labels.push({ label: months[month], weekIndex: index });
        lastMonth = month;
      }
    });
    
    return labels;
  }, [weeks]);

  const totalReviews = useMemo(() => {
    let total = 0;
    heatmapData.forEach(count => total += count);
    return total;
  }, [heatmapData]);

  const activeDays = useMemo(() => {
    let count = 0;
    heatmapData.forEach(reviews => { if (reviews > 0) count++; });
    return count;
  }, [heatmapData]);

  return (
    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" mt={6}>
      <CardBody>
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Study Heatmap</Heading>
          <HStack spacing={4}>
            <Text fontSize="sm" color="gray.600">
              {totalReviews.toLocaleString()} reviews in the last year
            </Text>
            <Text fontSize="sm" color="gray.600">
              {activeDays} active days
            </Text>
          </HStack>
        </HStack>
        
        <Box overflowX="auto" pb={2}>
          {/* Month labels */}
          <Flex mb={1} ml="30px">
            {monthLabels.map(({ label, weekIndex }) => (
              <Text
                key={`${label}-${weekIndex}`}
                fontSize="xs"
                color="gray.500"
                position="absolute"
                left={`${30 + weekIndex * 14}px`}
              >
                {label}
              </Text>
            ))}
          </Flex>
          
          <Flex mt={5}>
            {/* Day labels */}
            <VStack spacing={0} mr={2} align="flex-end">
              <Text fontSize="xs" color="gray.500" h="14px"></Text>
              <Text fontSize="xs" color="gray.500" h="14px">Mon</Text>
              <Text fontSize="xs" color="gray.500" h="14px"></Text>
              <Text fontSize="xs" color="gray.500" h="14px">Wed</Text>
              <Text fontSize="xs" color="gray.500" h="14px"></Text>
              <Text fontSize="xs" color="gray.500" h="14px">Fri</Text>
              <Text fontSize="xs" color="gray.500" h="14px"></Text>
            </VStack>
            
            {/* Heatmap grid */}
            <Flex gap="2px">
              {weeks.map((week, weekIndex) => (
                <VStack key={weekIndex} spacing="2px">
                  {week.map((day) => (
                    <Tooltip
                      key={day.dateStr}
                      label={`${day.count} reviews on ${day.date.toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}`}
                      fontSize="xs"
                      hasArrow
                    >
                      <Box
                        w="12px"
                        h="12px"
                        bg={getColor(day.count)}
                        borderRadius="2px"
                        cursor="pointer"
                        _hover={{ outline: '1px solid', outlineColor: 'gray.400' }}
                      />
                    </Tooltip>
                  ))}
                </VStack>
              ))}
            </Flex>
          </Flex>
          
          {/* Legend */}
          <Flex justify="flex-end" align="center" mt={3} gap={1}>
            <Text fontSize="xs" color="gray.500" mr={1}>Less</Text>
            <Box w="12px" h="12px" bg="#ebedf0" borderRadius="2px" />
            <Box w="12px" h="12px" bg="#9be9a8" borderRadius="2px" />
            <Box w="12px" h="12px" bg="#40c463" borderRadius="2px" />
            <Box w="12px" h="12px" bg="#30a14e" borderRadius="2px" />
            <Box w="12px" h="12px" bg="#216e39" borderRadius="2px" />
            <Text fontSize="xs" color="gray.500" ml={1}>More</Text>
          </Flex>
        </Box>
      </CardBody>
    </Card>
  );
}
