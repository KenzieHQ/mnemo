import React, { useState, useMemo } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Textarea,
  VStack,
  HStack,
  Text,
  Select,
  FormControl,
  FormLabel,
  FormHelperText,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Alert,
  AlertIcon,
  useColorModeValue,
  Icon,
  Divider,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Code,
  RadioGroup,
  Radio,
  Stack,
} from '@chakra-ui/react';
import { FileText, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { parseClozeText } from '@/lib/card-utils';
import type { CardType } from '@/types';

interface ParsedCard {
  front: string;
  back: string;
  isValid: boolean;
  error?: string;
  lineNumber: number;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (cards: { front: string; back: string }[], cardType: CardType) => Promise<void>;
  deckId: string;
  deckName: string;
}

type Delimiter = '|' | '::' | '\t' | ';';

const DELIMITER_OPTIONS: { value: Delimiter; label: string; example: string }[] = [
  { value: '|', label: 'Pipe ( | )', example: 'Front | Back' },
  { value: '::', label: 'Double Colon ( :: )', example: 'Front :: Back' },
  { value: '\t', label: 'Tab', example: 'Front[TAB]Back' },
  { value: ';', label: 'Semicolon ( ; )', example: 'Front ; Back' },
];

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  deckName,
}) => {
  const [inputText, setInputText] = useState('');
  const [delimiter, setDelimiter] = useState<Delimiter>('|');
  const [cardType, setCardType] = useState<CardType>('basic');
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const cardBg = useColorModeValue('white', 'gray.800');
  const subtleText = useColorModeValue('gray.600', 'gray.400');
  const errorBg = useColorModeValue('red.50', 'red.900');

  // Parse the input text into cards
  const parsedCards: ParsedCard[] = useMemo(() => {
    if (!inputText.trim()) return [];

    const lines = inputText.split('\n');
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        return {
          front: '',
          back: '',
          isValid: false,
          error: 'Empty line',
          lineNumber: index + 1,
        };
      }

      // For cloze cards, we only need the front with cloze markers
      if (cardType === 'cloze') {
        // Check if line has cloze markers
        const { clozeCount } = parseClozeText(trimmedLine);
        if (clozeCount === 0) {
          return {
            front: trimmedLine,
            back: '',
            isValid: false,
            error: 'No cloze deletion found (use {{c1::text}})',
            lineNumber: index + 1,
          };
        }
        return {
          front: trimmedLine,
          back: '',
          isValid: true,
          lineNumber: index + 1,
        };
      }

      // For basic cards, split by delimiter
      const parts = trimmedLine.split(delimiter);
      
      if (parts.length < 2) {
        return {
          front: trimmedLine,
          back: '',
          isValid: false,
          error: `Missing delimiter "${delimiter === '\t' ? 'TAB' : delimiter}"`,
          lineNumber: index + 1,
        };
      }

      const front = parts[0].trim();
      const back = parts.slice(1).join(delimiter).trim(); // Join remaining parts in case delimiter appears in answer

      if (!front) {
        return {
          front: '',
          back,
          isValid: false,
          error: 'Front side is empty',
          lineNumber: index + 1,
        };
      }

      if (!back) {
        return {
          front,
          back: '',
          isValid: false,
          error: 'Back side is empty',
          lineNumber: index + 1,
        };
      }

      return {
        front,
        back,
        isValid: true,
        lineNumber: index + 1,
      };
    }).filter(card => card.front || card.back || card.error !== 'Empty line');
  }, [inputText, delimiter, cardType]);

  const validCards = parsedCards.filter(c => c.isValid);
  const invalidCards = parsedCards.filter(c => !c.isValid);

  const handleImport = async () => {
    if (validCards.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(validCards.map(c => ({ front: c.front, back: c.back })), cardType);
      setInputText('');
      setCardType('basic');
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setInputText('');
    setCardType('basic');
    setActiveTab(0);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="800px">
        <ModalHeader>
          <HStack spacing={3}>
            <Icon as={Upload} color="blue.500" />
            <Text>Bulk Import Flashcards</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Deck Info */}
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Text>
                Importing to deck: <strong>{deckName}</strong>
              </Text>
            </Alert>

            {/* Card Type Selection */}
            <FormControl>
              <FormLabel>Card Type</FormLabel>
              <RadioGroup value={cardType} onChange={(val) => setCardType(val as CardType)}>
                <Stack direction="row" spacing={6}>
                  <Radio value="basic">Basic (Front → Back)</Radio>
                  <Radio value="cloze">Cloze Deletion</Radio>
                </Stack>
              </RadioGroup>
              <FormHelperText>
                {cardType === 'basic' 
                  ? 'Each line needs front and back separated by a delimiter'
                  : 'Each line should contain cloze markers like {{c1::answer}}'
                }
              </FormHelperText>
            </FormControl>

            <Tabs index={activeTab} onChange={setActiveTab}>
              <TabList>
                <Tab>Input</Tab>
                <Tab>
                  Preview
                  {validCards.length > 0 && (
                    <Badge ml={2} colorScheme="green">{validCards.length}</Badge>
                  )}
                </Tab>
                {invalidCards.length > 0 && (
                  <Tab>
                    Errors
                    <Badge ml={2} colorScheme="red">{invalidCards.length}</Badge>
                  </Tab>
                )}
              </TabList>

              <TabPanels>
                {/* Input Tab */}
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    {/* Delimiter Selection - Only for basic cards */}
                    {cardType === 'basic' && (
                      <FormControl>
                        <FormLabel>Delimiter</FormLabel>
                        <Select
                          value={delimiter}
                          onChange={(e) => setDelimiter(e.target.value as Delimiter)}
                        >
                          {DELIMITER_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label} — {opt.example}
                            </option>
                          ))}
                        </Select>
                        <FormHelperText>
                          Choose the character that separates front and back of each card
                        </FormHelperText>
                      </FormControl>
                    )}

                    {/* Text Input */}
                    <FormControl>
                      <FormLabel>Flashcards (one per line)</FormLabel>
                      <Textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={cardType === 'basic' 
                          ? `Enter one flashcard per line:\n\nCapital of France ${delimiter} Paris\nCapital of Japan ${delimiter} Tokyo\nCapital of Italy ${delimiter} Rome`
                          : `Enter one cloze card per line:\n\nThe {{c1::mitochondria}} is the powerhouse of the cell.\nWater's chemical formula is {{c1::H2O}}.\n{{c1::Paris}} is the capital of {{c2::France}}.`
                        }
                        minH="250px"
                        fontFamily="mono"
                        fontSize="sm"
                      />
                      <FormHelperText>
                        {parsedCards.length > 0 ? (
                          <HStack spacing={4}>
                            <HStack>
                              <Icon as={CheckCircle2} color="green.500" boxSize={4} />
                              <Text>{validCards.length} valid</Text>
                            </HStack>
                            {invalidCards.length > 0 && (
                              <HStack>
                                <Icon as={AlertCircle} color="red.500" boxSize={4} />
                                <Text>{invalidCards.length} with errors</Text>
                              </HStack>
                            )}
                          </HStack>
                        ) : (
                          'Paste or type your flashcards above'
                        )}
                      </FormHelperText>
                    </FormControl>

                    {/* Format Help */}
                    <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md">
                      <Text fontWeight="medium" mb={2}>Format Guide</Text>
                      {cardType === 'basic' ? (
                        <>
                          <VStack align="start" spacing={1} fontSize="sm" color={subtleText}>
                            <Text>• One flashcard per line</Text>
                            <Text>• Use the selected delimiter to separate front and back</Text>
                            <Text>• Empty lines are automatically skipped</Text>
                            <Text>• Leading/trailing whitespace is trimmed</Text>
                          </VStack>
                          <Divider my={3} />
                          <Text fontWeight="medium" mb={2}>Example:</Text>
                          <Code p={2} display="block" whiteSpace="pre" fontSize="sm">
{`What is photosynthesis? ${delimiter} The process by which plants convert light to energy
H2O chemical name ${delimiter} Water
Mitochondria function ${delimiter} Powerhouse of the cell`}
                          </Code>
                        </>
                      ) : (
                        <>
                          <VStack align="start" spacing={1} fontSize="sm" color={subtleText}>
                            <Text>• One cloze card per line</Text>
                            <Text>• Use {"{{c1::text}}"} to create a cloze deletion</Text>
                            <Text>• Use {"{{c1::answer::hint}}"} to add a hint</Text>
                            <Text>• Multiple deletions (c1, c2, etc.) create separate cards</Text>
                          </VStack>
                          <Divider my={3} />
                          <Text fontWeight="medium" mb={2}>Example:</Text>
                          <Code p={2} display="block" whiteSpace="pre" fontSize="sm">
{`The {{c1::mitochondria}} is the powerhouse of the cell.
Water's chemical formula is {{c1::H2O::chemical}}.
{{c1::Paris}} is the capital of {{c2::France}}.`}
                          </Code>
                          <Alert status="info" mt={3} size="sm" borderRadius="md">
                            <AlertIcon />
                            <Text fontSize="sm">
                              Each cloze marker (c1, c2, etc.) generates a separate study card.
                            </Text>
                          </Alert>
                        </>
                      )}
                    </Box>
                  </VStack>
                </TabPanel>

                {/* Preview Tab */}
                <TabPanel px={0}>
                  {validCards.length === 0 ? (
                    <Box textAlign="center" py={8}>
                      <Icon as={FileText} boxSize={12} color={subtleText} mb={4} />
                      <Text color={subtleText}>
                        No valid flashcards to preview. Enter some cards in the Input tab.
                      </Text>
                    </Box>
                  ) : (
                    <Box maxH="400px" overflowY="auto">
                      <Table size="sm">
                        <Thead position="sticky" top={0} bg={cardBg}>
                          <Tr>
                            <Th w="50px">#</Th>
                            <Th>{cardType === 'cloze' ? 'Cloze Text' : 'Front'}</Th>
                            {cardType === 'basic' && <Th>Back</Th>}
                            {cardType === 'cloze' && <Th w="80px">Cards</Th>}
                          </Tr>
                        </Thead>
                        <Tbody>
                          {validCards.map((card, index) => {
                            const clozeInfo = cardType === 'cloze' ? parseClozeText(card.front) : null;
                            return (
                              <Tr key={index}>
                                <Td color={subtleText}>{index + 1}</Td>
                                <Td>
                                  <Text noOfLines={2}>{card.front}</Text>
                                </Td>
                                {cardType === 'basic' && (
                                  <Td>
                                    <Text noOfLines={2}>{card.back}</Text>
                                  </Td>
                                )}
                                {cardType === 'cloze' && (
                                  <Td>
                                    <Badge colorScheme="purple">{clozeInfo?.clozeCount || 0}</Badge>
                                  </Td>
                                )}
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </Box>
                  )}
                </TabPanel>

                {/* Errors Tab */}
                {invalidCards.length > 0 && (
                  <TabPanel px={0}>
                    <VStack spacing={2} align="stretch">
                      {invalidCards.map((card, index) => (
                        <Box
                          key={index}
                          p={3}
                          bg={errorBg}
                          borderRadius="md"
                          borderLeft="4px solid"
                          borderLeftColor="red.500"
                        >
                          <HStack justify="space-between" mb={1}>
                            <Badge colorScheme="red">Line {card.lineNumber}</Badge>
                            <Text fontSize="sm" color="red.500" fontWeight="medium">
                              {card.error}
                            </Text>
                          </HStack>
                          <Code fontSize="sm" bg="transparent">
                            {card.front || '(empty)'}
                          </Code>
                        </Box>
                      ))}
                    </VStack>
                  </TabPanel>
                )}
              </TabPanels>
            </Tabs>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleImport}
              isLoading={isImporting}
              loadingText="Importing..."
              isDisabled={validCards.length === 0}
              leftIcon={<Icon as={Upload} />}
            >
              Import {validCards.length} Card{validCards.length !== 1 ? 's' : ''}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BulkImportModal;
