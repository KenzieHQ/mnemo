import { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  Button,
  HStack,
  VStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Progress,
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
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import {
  Plus,
  Search,
  Layers,
  Play,
  Edit2,
  Trash2,
  MoreVertical,
  BookOpen,
  Code,
  Languages,
  FlaskConical,
  History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDecks, useSettings } from '@/hooks/useData';
import { db } from '@/db/database';
import { v4 as uuidv4 } from 'uuid';
import type { Deck, DeckWithStats } from '@/types';
import React from 'react';

const deckIcons: Record<string, React.ElementType> = {
  layers: Layers,
  book: BookOpen,
  code: Code,
  languages: Languages,
  flask: FlaskConical,
  history: History,
};

const deckColors = [
  { name: 'Blue', value: 'blue.100', iconColor: 'blue.600' },
  { name: 'Green', value: 'green.100', iconColor: 'green.600' },
  { name: 'Orange', value: 'orange.100', iconColor: 'orange.600' },
  { name: 'Purple', value: 'purple.100', iconColor: 'purple.600' },
  { name: 'Red', value: 'red.100', iconColor: 'red.600' },
  { name: 'Teal', value: 'teal.100', iconColor: 'teal.600' },
];

interface DeckFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
}

export default function Decks() {
  const navigate = useNavigate();
  const toast = useToast();
  const decks = useDecks();
  const settings = useSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'due'>('all');
  const [editingDeck, setEditingDeck] = useState<DeckWithStats | null>(null);
  const [deletingDeck, setDeletingDeck] = useState<DeckWithStats | null>(null);
  
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const [formData, setFormData] = useState<DeckFormData>({
    name: '',
    description: '',
    icon: 'layers',
    color: 'blue.100',
  });

  const cardBg = 'white';
  const borderColor = 'gray.200';
  const subtleText = 'gray.600';

  // Filter decks
  const filteredDecks = decks?.filter(deck => {
    const matchesSearch = deck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          deck.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || deck.dueToday > 0;
    return matchesSearch && matchesFilter;
  }) ?? [];

  const handleCreateDeck = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Deck name is required',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    const newDeck: Deck = {
      id: uuidv4(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      icon: formData.icon,
      color: formData.color,
      parentId: null,
      newCardsPerDay: settings?.defaultNewCardsPerDay ?? 20,
      reviewsPerDay: settings?.defaultReviewsPerDay ?? 200,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.decks.add(newDeck);
    
    toast({
      title: 'Deck created',
      description: `"${newDeck.name}" has been created`,
      status: 'success',
      duration: 3000,
    });

    setFormData({ name: '', description: '', icon: 'layers', color: 'blue.100' });
    onCreateClose();
  };

  const handleEditDeck = async () => {
    if (!editingDeck) return;

    await db.decks.update(editingDeck.id, {
      name: formData.name.trim(),
      description: formData.description.trim(),
      icon: formData.icon,
      color: formData.color,
      updatedAt: Date.now(),
    });

    toast({
      title: 'Deck updated',
      status: 'success',
      duration: 3000,
    });

    setEditingDeck(null);
    setFormData({ name: '', description: '', icon: 'layers', color: 'blue.100' });
  };

  const handleDeleteDeck = async () => {
    if (!deletingDeck) return;

    // Delete all cards in the deck
    await db.cards.where('deckId').equals(deletingDeck.id).delete();
    // Delete the deck
    await db.decks.delete(deletingDeck.id);

    toast({
      title: 'Deck deleted',
      description: `"${deletingDeck.name}" and all its cards have been deleted`,
      status: 'info',
      duration: 3000,
    });

    setDeletingDeck(null);
    onDeleteClose();
  };

  const openEditModal = (deck: DeckWithStats) => {
    setEditingDeck(deck);
    setFormData({
      name: deck.name,
      description: deck.description,
      icon: deck.icon,
      color: deck.color,
    });
  };

  const openDeleteDialog = (deck: DeckWithStats) => {
    setDeletingDeck(deck);
    onDeleteOpen();
  };

  const getIconComponent = (iconName: string) => {
    return deckIcons[iconName] || Layers;
  };

  const getColorValue = (colorName: string) => {
    return deckColors.find(c => c.value === colorName) || deckColors[0];
  };

  return (
    <Box maxW="1400px" mx="auto">
      {/* Header */}
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg" mb={2}>My Decks</Heading>
          <Text color={subtleText}>
            Manage your learning material and track your progress.
          </Text>
        </Box>
        <Button
          colorScheme="blue"
          leftIcon={<Icon as={Plus} />}
          onClick={onCreateOpen}
        >
          Create New Deck
        </Button>
      </HStack>

      {/* Filters */}
      <HStack spacing={4} mb={6} flexWrap="wrap">
        <InputGroup maxW="400px">
          <InputLeftElement>
            <Icon as={Search} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search your decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg={cardBg}
          />
        </InputGroup>
        <Select
          maxW="150px"
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'due')}
          bg={cardBg}
        >
          <option value="all">All Decks</option>
          <option value="due">Due Today</option>
        </Select>
      </HStack>

      {/* Decks Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {filteredDecks.map((deck) => {
          const IconComponent = getIconComponent(deck.icon);
          const colorInfo = getColorValue(deck.color);
          
          return (
            <Card 
              key={deck.id} 
              bg={cardBg} 
              borderWidth="1px" 
              borderColor={borderColor}
              _hover={{ shadow: 'md' }}
              transition="all 0.2s"
            >
              <CardBody>
                <HStack justify="space-between" mb={4}>
                  <Box
                    w={10}
                    h={10}
                    borderRadius="lg"
                    bg={colorInfo.value}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={IconComponent} boxSize={5} color={colorInfo.iconColor} />
                  </Box>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<Icon as={MoreVertical} />}
                      variant="ghost"
                      size="sm"
                    />
                    <MenuList>
                      <MenuItem 
                        icon={<Icon as={Edit2} />}
                        onClick={() => openEditModal(deck)}
                      >
                        Edit
                      </MenuItem>
                      <MenuItem 
                        icon={<Icon as={Trash2} />}
                        color="red.500"
                        onClick={() => openDeleteDialog(deck)}
                      >
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </HStack>

                <Heading size="md" mb={1} noOfLines={1}>{deck.name}</Heading>
                <Text fontSize="sm" color={subtleText} mb={4}>
                  {deck.dueToday > 0 
                    ? `${deck.dueToday} cards due today`
                    : 'No cards due today'}
                </Text>

                <Box mb={4}>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={subtleText}>
                      Maturity
                    </Text>
                    <Text fontSize="xs" fontWeight="600">
                      {deck.maturityPercent}%
                    </Text>
                  </HStack>
                  <Progress 
                    value={deck.maturityPercent} 
                    size="sm" 
                    colorScheme="green" 
                    borderRadius="full"
                  />
                </Box>

                <Button
                  w="full"
                  colorScheme="blue"
                  variant="outline"
                  leftIcon={<Icon as={Play} />}
                  onClick={() => navigate(`/study/${deck.id}`)}
                  isDisabled={deck.totalCards === 0}
                >
                  Study Now
                </Button>
              </CardBody>
            </Card>
          );
        })}

        {/* Add New Deck Card */}
        <Card 
          bg={cardBg} 
          borderWidth="2px" 
          borderColor={borderColor}
          borderStyle="dashed"
          cursor="pointer"
          onClick={onCreateOpen}
          _hover={{ borderColor: 'blue.500', bg: 'blue.50' }}
          transition="all 0.2s"
        >
          <CardBody>
            <VStack justify="center" h="full" minH="200px" spacing={3}>
              <Icon as={Plus} boxSize={8} color={subtleText} />
              <Text fontWeight="600" color={subtleText}>Add New Deck</Text>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Create/Edit Deck Modal */}
      <Modal 
        isOpen={isCreateOpen || !!editingDeck} 
        onClose={() => {
          onCreateClose();
          setEditingDeck(null);
          setFormData({ name: '', description: '', icon: 'layers', color: 'blue.100' });
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingDeck ? 'Edit Deck' : 'Create New Deck'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  placeholder="e.g., Japanese Vocabulary"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="What is this deck about?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Icon</FormLabel>
                <HStack spacing={2} flexWrap="wrap">
                  {Object.entries(deckIcons).map(([name, IconComp]) => (
                    <IconButton
                      key={name}
                      aria-label={name}
                      icon={<Icon as={IconComp} />}
                      variant={formData.icon === name ? 'solid' : 'outline'}
                      colorScheme={formData.icon === name ? 'blue' : 'gray'}
                      onClick={() => setFormData({ ...formData, icon: name })}
                    />
                  ))}
                </HStack>
              </FormControl>

              <FormControl>
                <FormLabel>Color</FormLabel>
                <HStack spacing={2} flexWrap="wrap">
                  {deckColors.map((color) => (
                    <Box
                      key={color.value}
                      w={8}
                      h={8}
                      borderRadius="md"
                      bg={color.value}
                      cursor="pointer"
                      borderWidth="2px"
                      borderColor={formData.color === color.value ? 'blue.500' : 'transparent'}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                    />
                  ))}
                </HStack>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => {
              onCreateClose();
              setEditingDeck(null);
              setFormData({ name: '', description: '', icon: 'layers', color: 'blue.100' });
            }}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={editingDeck ? handleEditDeck : handleCreateDeck}
            >
              {editingDeck ? 'Save Changes' : 'Create Deck'}
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
              Delete Deck
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete "{deletingDeck?.name}"? This will also delete all {deletingDeck?.totalCards} cards in this deck. This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteDeck} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
