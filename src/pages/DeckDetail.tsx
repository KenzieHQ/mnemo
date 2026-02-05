import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  HStack,
  VStack,
  Icon,
  useColorModeValue,
  Card,
  CardBody,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  Select,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react';
import {
  ArrowLeft,
  Plus,
  Play,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useDeckWithStats, useCards, useSettings } from '@/hooks/useData';
import { db } from '@/db/database';
import { v4 as uuidv4 } from 'uuid';
import type { Card as CardType, CardType as CardTypeEnum } from '@/types';
import { parseClozeText, renderClozeQuestion } from '@/lib/card-utils';
import React from 'react';

export default function DeckDetail() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  const deck = useDeckWithStats(deckId);
  const cards = useCards(deckId);
  const settings = useSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [deletingCard, setDeletingCard] = useState<CardType | null>(null);
  
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const [formData, setFormData] = useState({
    front: '',
    back: '',
    type: 'basic' as CardTypeEnum,
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const subtleText = useColorModeValue('gray.600', 'gray.400');

  if (!deck) {
    return (
      <Box textAlign="center" py={10}>
        <Text color={subtleText}>Deck not found</Text>
        <Button mt={4} onClick={() => navigate('/decks')}>
          Back to Decks
        </Button>
      </Box>
    );
  }

  const filteredCards = cards?.filter(card =>
    card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.back.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const handleCreateCard = async () => {
    if (!formData.front.trim()) {
      toast({
        title: 'Error',
        description: 'Front side is required',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (formData.type === 'basic' && !formData.back.trim()) {
      toast({
        title: 'Error',
        description: 'Back side is required for basic cards',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (formData.type === 'cloze') {
      const { clozeCount } = parseClozeText(formData.front);
      if (clozeCount === 0) {
        toast({
          title: 'Error',
          description: 'Cloze cards must have at least one cloze deletion (e.g., {{c1::text}})',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      // Create multiple cards for each cloze deletion
      for (let i = 1; i <= clozeCount; i++) {
        const newCard: CardType = {
          id: uuidv4(),
          deckId: deckId!,
          type: 'cloze',
          front: formData.front.trim(),
          back: formData.back.trim() || formData.front.trim(),
          clozeIndex: i,
          easeFactor: settings?.defaultEaseFactor ?? 2.5,
          interval: 0,
          repetitions: 0,
          learningState: 'new',
          nextReview: Date.now(),
          lapses: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await db.cards.add(newCard);
      }

      toast({
        title: 'Cards created',
        description: `${clozeCount} cloze cards have been created`,
        status: 'success',
        duration: 3000,
      });
    } else {
      const newCard: CardType = {
        id: uuidv4(),
        deckId: deckId!,
        type: 'basic',
        front: formData.front.trim(),
        back: formData.back.trim(),
        easeFactor: settings?.defaultEaseFactor ?? 2.5,
        interval: 0,
        repetitions: 0,
        learningState: 'new',
        nextReview: Date.now(),
        lapses: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.cards.add(newCard);

      toast({
        title: 'Card created',
        status: 'success',
        duration: 3000,
      });
    }

    setFormData({ front: '', back: '', type: 'basic' });
    onCreateClose();
  };

  const handleEditCard = async () => {
    if (!editingCard) return;

    await db.cards.update(editingCard.id, {
      front: formData.front.trim(),
      back: formData.back.trim(),
      updatedAt: Date.now(),
    });

    toast({
      title: 'Card updated',
      status: 'success',
      duration: 3000,
    });

    setEditingCard(null);
    setFormData({ front: '', back: '', type: 'basic' });
  };

  const handleDeleteCard = async () => {
    if (!deletingCard) return;

    await db.cards.delete(deletingCard.id);

    toast({
      title: 'Card deleted',
      status: 'info',
      duration: 3000,
    });

    setDeletingCard(null);
    onDeleteClose();
  };

  const openEditModal = (card: CardType) => {
    setEditingCard(card);
    setFormData({
      front: card.front,
      back: card.back,
      type: card.type,
    });
  };

  const openDeleteDialog = (card: CardType) => {
    setDeletingCard(card);
    onDeleteOpen();
  };

  const getStateBadge = (state: string) => {
    const colors: Record<string, string> = {
      new: 'blue',
      learning: 'orange',
      review: 'green',
      mature: 'purple',
    };
    return (
      <Badge colorScheme={colors[state] || 'gray'} textTransform="capitalize">
        {state}
      </Badge>
    );
  };

  const renderCardFront = (card: CardType) => {
    if (card.type === 'cloze' && card.clozeIndex) {
      return renderClozeQuestion(card.front, card.clozeIndex);
    }
    return card.front;
  };

  return (
    <Box maxW="1400px" mx="auto">
      {/* Header */}
      <HStack mb={6}>
        <IconButton
          aria-label="Back"
          icon={<Icon as={ArrowLeft} />}
          variant="ghost"
          onClick={() => navigate('/decks')}
        />
        <Box flex={1}>
          <Heading size="lg">{deck.name}</Heading>
          {deck.description && (
            <Text color={subtleText}>{deck.description}</Text>
          )}
        </Box>
        <Button
          colorScheme="blue"
          leftIcon={<Icon as={Play} />}
          onClick={() => navigate(`/study/${deckId}`)}
          isDisabled={deck.totalCards === 0}
        >
          Study Now
        </Button>
      </HStack>

      {/* Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel color={subtleText}>Total Cards</StatLabel>
              <StatNumber>{deck.totalCards}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel color={subtleText}>New</StatLabel>
              <StatNumber color="blue.500">{deck.newCards}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel color={subtleText}>Learning</StatLabel>
              <StatNumber color="orange.500">{deck.learningCards}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel color={subtleText}>Due Today</StatLabel>
              <StatNumber color="green.500">{deck.dueToday}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Tabs */}
      <Tabs>
        <TabList>
          <Tab>Cards ({filteredCards.length})</Tab>
          <Tab>Statistics</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            {/* Search and Add */}
            <HStack mb={4} flexWrap="wrap" gap={4}>
              <InputGroup maxW="400px">
                <InputLeftElement>
                  <Icon as={Search} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  bg={cardBg}
                />
              </InputGroup>
              <Button
                colorScheme="blue"
                leftIcon={<Icon as={Plus} />}
                onClick={onCreateOpen}
              >
                Add Card
              </Button>
            </HStack>

            {/* Cards Table */}
            {filteredCards.length === 0 ? (
              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <VStack py={10} spacing={4}>
                    <Icon as={BookOpen} boxSize={12} color={subtleText} />
                    <Text color={subtleText}>
                      {searchQuery ? 'No cards match your search' : 'No cards in this deck yet'}
                    </Text>
                    <Button
                      colorScheme="blue"
                      leftIcon={<Icon as={Plus} />}
                      onClick={onCreateOpen}
                    >
                      Add Your First Card
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ) : (
              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} overflow="hidden">
                <Box overflowX="auto">
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Front</Th>
                        <Th>Back</Th>
                        <Th>Type</Th>
                        <Th>State</Th>
                        <Th>Due</Th>
                        <Th width="100px">Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredCards.map((card) => (
                        <Tr key={card.id}>
                          <Td maxW="250px" isTruncated>{renderCardFront(card)}</Td>
                          <Td maxW="250px" isTruncated>{card.back}</Td>
                          <Td>
                            <Badge colorScheme={card.type === 'cloze' ? 'purple' : 'gray'}>
                              {card.type}
                            </Badge>
                          </Td>
                          <Td>{getStateBadge(card.learningState)}</Td>
                          <Td>
                            {card.learningState === 'new' ? (
                              <HStack color="blue.500">
                                <Icon as={AlertCircle} boxSize={4} />
                                <Text>New</Text>
                              </HStack>
                            ) : card.nextReview <= Date.now() ? (
                              <HStack color="green.500">
                                <Icon as={CheckCircle2} boxSize={4} />
                                <Text>Due</Text>
                              </HStack>
                            ) : (
                              <HStack color={subtleText}>
                                <Icon as={Clock} boxSize={4} />
                                <Text>
                                  {new Date(card.nextReview).toLocaleDateString()}
                                </Text>
                              </HStack>
                            )}
                          </Td>
                          <Td>
                            <HStack>
                              <IconButton
                                aria-label="Edit"
                                icon={<Icon as={Edit2} boxSize={4} />}
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditModal(card)}
                              />
                              <IconButton
                                aria-label="Delete"
                                icon={<Icon as={Trash2} boxSize={4} />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => openDeleteDialog(card)}
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Card>
            )}
          </TabPanel>

          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <Heading size="sm" mb={4}>Card Breakdown</Heading>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <Text>New</Text>
                      <Badge colorScheme="blue">{deck.newCards}</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Learning</Text>
                      <Badge colorScheme="orange">{deck.learningCards}</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Review</Text>
                      <Badge colorScheme="green">{deck.reviewCards}</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Mature</Text>
                      <Badge colorScheme="purple">{deck.matureCards}</Badge>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <Heading size="sm" mb={4}>Deck Settings</Heading>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <Text>New cards/day</Text>
                      <Badge>{deck.newCardsPerDay}</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Reviews/day</Text>
                      <Badge>{deck.reviewsPerDay}</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Maturity</Text>
                      <Badge colorScheme="green">{deck.maturityPercent}%</Badge>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Create/Edit Card Modal */}
      <Modal 
        isOpen={isCreateOpen || !!editingCard} 
        onClose={() => {
          onCreateClose();
          setEditingCard(null);
          setFormData({ front: '', back: '', type: 'basic' });
        }}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCard ? 'Edit Card' : 'Add New Card'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {!editingCard && (
                <FormControl>
                  <FormLabel>Card Type</FormLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as CardTypeEnum })}
                  >
                    <option value="basic">Basic (Front → Back)</option>
                    <option value="cloze">Cloze Deletion</option>
                  </Select>
                </FormControl>
              )}

              <FormControl isRequired>
                <FormLabel>
                  {formData.type === 'cloze' ? 'Text (use {{c1::text}} for cloze)' : 'Front'}
                </FormLabel>
                <Textarea
                  placeholder={formData.type === 'cloze' 
                    ? 'The {{c1::mitochondria}} is the {{c2::powerhouse}} of the cell.'
                    : 'What is the capital of France?'}
                  value={formData.front}
                  onChange={(e) => setFormData({ ...formData, front: e.target.value })}
                  rows={4}
                />
              </FormControl>

              <FormControl isRequired={formData.type === 'basic'}>
                <FormLabel>
                  {formData.type === 'cloze' ? 'Extra Info (optional)' : 'Back'}
                </FormLabel>
                <Textarea
                  placeholder={formData.type === 'cloze'
                    ? 'Additional context or explanation'
                    : 'Paris'}
                  value={formData.back}
                  onChange={(e) => setFormData({ ...formData, back: e.target.value })}
                  rows={4}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => {
              onCreateClose();
              setEditingCard(null);
              setFormData({ front: '', back: '', type: 'basic' });
            }}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={editingCard ? handleEditCard : handleCreateCard}
            >
              {editingCard ? 'Save Changes' : 'Add Card'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Card
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this card? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteCard} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
