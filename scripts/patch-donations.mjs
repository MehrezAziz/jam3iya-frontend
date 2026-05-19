import { readFileSync, writeFileSync } from 'fs';

const p = 'app/[locale]/(org)/donations/page.tsx';
let s = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const old = `                    <div className="font-semibold tabular-nums">{formatTndMinor(d.amountMinor)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
`;

const neu = `                    <motionPlaceholder className="flex flex-col items-end gap-2">
                      {d.kind === 'cash' ? <DonationPrintButton donation={d} t={t} /> : null}
                      <span className="font-semibold tabular-nums">{formatTndMinor(d.amountMinor)}</span>
                    </motionPlaceholder>
                  </motionPlaceholder>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </motionPlaceholder>
  );
}

function DonationPrintButton({
  donation,
  t,
}: {
  donation: DonationItem;
  t: (k: string) => string;
}) {
  const issueMut = useMutation({
    mutationFn: async () => {
      if (donation.receiptBill) return donation.receiptBill;
      const name = donation.isAnonymous
        ? t('donations.anonymous')
        : donation.donorNameSnapshot ?? t('donations.unknownDonor');
      const res = await issueDonationReceipt({
        donationId: donation.id,
        recipientName: name,
        isTaxReceipt: true,
      });
      return { id: res.id, number: res.number, series: 'RECEIPT', yearIssued: new Date().getFullYear() };
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function handlePrint() {
    try {
      const bill = await issueMut.mutateAsync();
      window.open(\`/bills/print?id=\${bill.id}\`, '_blank', 'noopener');
    } catch {
      /* handled */
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-8 w-8"
      onClick={handlePrint}
      disabled={issueMut.isPending}
      title={t('donations.printReceipt')}
    >
      <Printer className="h-4 w-4" />
    </Button>
  );
}
`.replace(/motionPlaceholder/g, 'div');

if (!s.includes(old)) {
  console.error('block not found');
  process.exit(1);
}
writeFileSync(p, s.replace(old, neu));
console.log('ok');
