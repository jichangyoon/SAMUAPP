# 관리자용 PostgreSQL 명령어 모음

## 유저 정보 조회
```sql
-- 전체 유저 목록
SELECT id, username, email, wallet_address, samu_balance, total_voting_power, created_at 
FROM users ORDER BY created_at DESC;

-- 특정 유저 검색 (지갑주소)
SELECT * FROM users WHERE wallet_address = '지갑주소';

-- 특정 유저 검색 (이메일)
SELECT * FROM users WHERE email = '이메일주소';

-- SAMU 잔액 높은 순서
SELECT username, samu_balance, total_voting_power 
FROM users ORDER BY samu_balance DESC;
```

## 유저 정보 수정
```sql
-- SAMU 잔액 업데이트
UPDATE users 
SET samu_balance = 1000000, 
    total_voting_power = 800000,
    updated_at = NOW()
WHERE wallet_address = '지갑주소';

-- 유저명 변경
UPDATE users 
SET username = '새로운이름',
    updated_at = NOW()
WHERE id = 1;

-- 이메일 업데이트
UPDATE users 
SET email = '새이메일@example.com',
    updated_at = NOW()
WHERE wallet_address = '지갑주소';
```

## 유저 삭제/비활성화
```sql
-- 유저 완전 삭제 (주의!)
DELETE FROM users WHERE id = 유저ID;

-- 유저 잔액 초기화
UPDATE users 
SET samu_balance = 0, 
    total_voting_power = 0,
    updated_at = NOW()
WHERE wallet_address = '지갑주소';
```

## 통계 조회
```sql
-- 총 유저 수
SELECT COUNT(*) as total_users FROM users;

-- 총 SAMU 보유량
SELECT SUM(samu_balance) as total_samu FROM users;

-- 활성 유저 (최근 30일)
SELECT COUNT(*) as active_users 
FROM users 
WHERE updated_at > NOW() - INTERVAL '30 days';

-- 유저별 밈 생성 통계
SELECT u.username, COUNT(m.id) as meme_count
FROM users u
LEFT JOIN memes m ON u.wallet_address = m.author_wallet
GROUP BY u.id, u.username
ORDER BY meme_count DESC;
```

## 밈/투표 관리
```sql
-- 특정 유저의 밈 목록
SELECT m.title, m.votes, m.created_at
FROM memes m
JOIN users u ON m.author_wallet = u.wallet_address
WHERE u.username = '유저명';

-- 특정 밈 삭제
DELETE FROM memes WHERE id = 밈ID;

-- 투표 기록 조회
SELECT v.*, u.username
FROM votes v
JOIN users u ON v.voter_wallet = u.wallet_address
WHERE v.meme_id = 밈ID;
```